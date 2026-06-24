import { Page } from "playwright"
import * as hud from "../utils/hud"
import * as layout from "../utils/layout"

export const menu = async (stage: string, page: Page) => {
  const modes: Record<string, string> = {
    barefiber: "bare fiber",
    buffering: "secondary tubing",
    stranding: "sz stranding",
    sheathing: "sheathing"
  }

  const mode = modes[stage.toLowerCase()]
  if (!mode) throw new Error("Invalid stage")

  await layout.render([`⚡ Starting ${hud.toTitleCase(stage)} mode`])
  await hud.updateHUD(page, [`⚡ Starting ${hud.toTitleCase(stage)} mode`])

  const frame = page.frameLocator("iframe.designer-client-frame")

  const clickMode = async () => {
    const buttons = frame.locator("button, a, [role='button']")
    const count = await buttons.count()

    for (let i = 0; i < count; i++) {
      const el = buttons.nth(i)
      const text = (await el.innerText()).toLowerCase()
      if (text.includes(mode)) {
        await el.click()
        return true
      }
    }

    return false
  }

  const ok = await clickMode()

  if (!ok) throw new Error("Mode not found")

  await hud.updateHUD(page, [`🚀 ${hud.toTitleCase(stage)} running`])
  await layout.render([`🚀 ${hud.toTitleCase(stage)} running`])
}