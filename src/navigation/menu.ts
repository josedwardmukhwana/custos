import { Page } from "playwright";
import * as hud from "../utils/hud";
import * as layout from "../utils/layout";

export const menu = async (stage: string, page: Page) => {
  const modes: Record<string, string> = {
    barefiber: "bare fibre",
    buffering: "secondary tubing",
    stranding: "sz stranding",
    sheathing: "sheathing"
  };

  const mode = modes[stage.toLowerCase()];
  if (!mode) throw new Error("Invalid stage");

  await hud.updateHUD(page, [`⚡ Starting ${hud.toTitleCase(modes[stage])} mode`]);

  const iframeElement = await page.waitForSelector("iframe.designer-client-frame", { timeout: 60000 });
  const frame = await iframeElement.contentFrame();
  if (!frame) throw new Error("⚠️ Unable to access ERP iframe");

  const tryClickMode = async (targetText: string, maxRetries = 15) => {
    for (let i = 0; i < maxRetries; i++) {
      const success = await frame.evaluate(async (text) => {
        const normalize = (str: string | null) => str ? str.trim().toLowerCase() : "";

        const getInteractiveElements = () => 
          Array.from(document.querySelectorAll('button, a, [role="menuitem"], [role="button"]')) as HTMLElement[];

        const findAndClick = (searchText: string) => {
          const el = getInteractiveElements().find(item => {
            const txt = normalize(item.textContent);
            const label = normalize(item.getAttribute('aria-label'));
            const title = normalize(item.getAttribute('title'));
            return txt === searchText || txt.includes(searchText) || 
                   label.includes(searchText) || title.includes(searchText);
          });

          if (el && el.offsetParent !== null) {
            el.click();
            return true;
          }
          return false;
        };

        if (findAndClick(text)) return true;

        if (findAndClick("more")) {
          await new Promise(r => setTimeout(r, 300));
          if (findAndClick(text)) return true;
        }
        return false;
      }, targetText);

      if (success) return true;

      await layout.render([`⏳ Searching for ${hud.toTitleCase(modes[stage])} (${i + 1}/${maxRetries})`], 500, true, true);
      await new Promise(res => setTimeout(res, 1000));
    }
    return false;
  };

  const btnFound = await tryClickMode(mode);
  if (!btnFound) throw new Error(`❌ Failed to find '${hud.toTitleCase(modes[stage])}'`);

  await hud.updateHUD(page, [`🚀 ${hud.toTitleCase(modes[stage])} running`]);
  await layout.render([`🚀 ${hud.toTitleCase(modes[stage])} running`], 1000, true, true, true);
};