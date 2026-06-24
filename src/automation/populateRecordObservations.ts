import { Page, Frame } from "playwright";
import * as hud from "../utils/hud";

export const populateRecordObservations = async (page: Page, stage: string, data: any) => {
  if (stage === "barefiber") return true;

  const frameHandle = await page.waitForSelector("iframe.designer-client-frame", { timeout: 100000 });
  const frame = await frameHandle.contentFrame();
  if (!frame) throw new Error("❌ Unable to access iframe");

  await hud.updateHUD(page, [`🔭 Populating Observations`, `🌀 Finalizing Approvals & Status`]);

  await frame.evaluate(async ({ stage, obsData, techName }) => {
    const expandSection = async (sectionTitle: string) => {
      const spans = Array.from(document.querySelectorAll('.caption-text'));
      const span = spans.find(el => el.textContent?.trim().toLowerCase() === sectionTitle.toLowerCase()) as HTMLElement;
      if (span) {
        const band = span.closest('.ms-nav-band');
        if (band?.classList.contains('collapsed')) {
          span.click();
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    };

    const fillField = async (controlName: string, value: string | number) => {
      const container = document.querySelector(`div[controlname="${controlName}"]`);
      if (!container) return;

      const select = container.querySelector('select');
      const textarea = container.querySelector('textarea');
      const input = container.querySelector('input');

      if (select) {
        const options = Array.from(select.querySelectorAll('option'));
        const target = options.find(o => o.textContent?.trim().toLowerCase() === String(value).toLowerCase());
        if (target) {
          select.value = target.value;
          ['input', 'change'].forEach(ev => select.dispatchEvent(new Event(ev, { bubbles: true })));
        }
      } else if (textarea) {
        textarea.value = String(value);
        ['input', 'change', 'blur'].forEach(ev => textarea.dispatchEvent(new Event(ev, { bubbles: true })));
      } else if (input) {
        input.value = String(value).toUpperCase();
        ['input', 'change', 'blur'].forEach(ev => input.dispatchEvent(new Event(ev, { bubbles: true })));
      }
      await new Promise(r => setTimeout(r, 200));
    };

    const getRandomRange = (min: number, max: number) => (Math.random() * (max - min) + min);

    if (stage === "buffering") {
      await expandSection("Tube Physical Measurements");
      const idControls = ["Tube ID (mm)", "Tube ID1 (mm)", "Tube ID (mm)2"];
      const odControls = ["Tube OD (mm)", "Tube OD1 (mm)", "Tube OD (mm)2"];
      const thkControls = ["Tube Thickness", "Tube Thickness1", "Tube Thickness2"];

      for (let i = 0; i < 3; i++) {
        const baseOD = parseFloat(String(obsData.od));
        const baseID = parseFloat(String(obsData.id));
        const baseThk = String(obsData.thickness);

        await fillField(odControls[i], (baseOD + getRandomRange(0.01, 0.09)).toFixed(2));
        await fillField(idControls[i], (baseID + getRandomRange(0.01, 0.09)).toFixed(2));
        
        const finalThk = (baseThk.includes('.') && baseThk.split('.')[1].length >= 2) 
          ? (parseFloat(baseThk) + getRandomRange(-0.02, 0.03)).toFixed(2)
          : (parseFloat(baseThk) + getRandomRange(0.01, 0.09)).toFixed(2);
          
        await fillField(thkControls[i], finalThk);
      }

      await expandSection("Condition Assessment");
      await fillField('Tube Physical Condition', obsData.physical ? "Smooth" : "Rough");
      await fillField('Tube Color Condition', obsData.color ? "Ok": "Not Ok");
      await fillField('Jelly Present', obsData.jelly ? "Yes" : "No");
      await fillField('Tube Circular', obsData.circular ? "Yes" : "No");

      await expandSection("Observations & Comments");
      await fillField('Process Issues/Comments', obsData.comment || "N/A");
    } else if (stage === "stranding") {
      await expandSection("Observations");
      const usedOD: number[] = [];
      const usedPar: number[] = [];
      const getRandom = (arr: number[]) => {
        let val: number;
        do { val = Math.floor(Math.random() * 9) + 1; } while (arr.includes(val));
        arr.push(val);
        return val;
      };

      for (let i = 0; i < 4; i++) {
        await fillField(`OD #${i + 1}`, (parseFloat(String(obsData.od)) + (getRandom(usedOD) / 100)).toFixed(2));
        await fillField(`FRP #${i + 1}`, (parseFloat(String(obsData.frp)) + (getRandom(usedPar) / 100)).toFixed(2));
      }
      for (const y of (obsData.yarns || [])) {
        if (y.type.toLowerCase().includes("water blocking")) {
          await fillField('W.B Yarn Used - Yes/No', y.present ? "Yes" : "No");
          await fillField('No. Of W.B. Yarns', y.count || "0");
        } else if (y.type.toLowerCase().includes("binder")) {
          await fillField('Binder Yarn Used - Yes/No', y.present ? "Yes"  : "No");
          await fillField('No. Of Binder Yarns', y.count || "0");
        }
      }
      for (const t of (obsData.tapes || [])) {
        if (t.type.toLowerCase().includes("water swellable")) {
          await fillField('Water Swellable Tape Used - Yes/No', t.present ? "Yes" : "No");
          await fillField('No. Of Water Swellable Tape', t.count || "0");
        } else if (t.type.toLowerCase().includes("identification")) {
          await fillField('No. Of Identification Tape', t.count || "0");
        }
      }
      await fillField('CSM Used - Yes/No', obsData.csm ? "Yes" : "No");
      await fillField('Filler Used - Yes/No', obsData.filler ? "Yes" : "No");
      await fillField('Process Issue / Comments', obsData.comment || "N/A");
      await expandSection("Approvals");
      await fillField('Tested By', techName);
    } else if (stage === "sheathing") {
      await expandSection("Observations");
      const usedOD: number[] = [];
      const usedPar: number[] = [];
      const getRandom = (arr: number[]) => {
        let val: number;
        do { val = Math.floor(Math.random() * 9) + 1; } while (arr.includes(val));
        arr.push(val);
        return val;
      };

      for (let i = 0; i < 3; i++) {
        await fillField(`OD #${i + 1}`, (parseFloat(String(obsData.od)) + (getRandom(usedOD) / 100)).toFixed(2));
        await fillField(`Thickness #${i + 1}`, (parseFloat(String(obsData.thickness)) + (getRandom(usedPar) / 100)).toFixed(2));
      }
      await fillField('Type Of Yarn', obsData.yarn);
      
      await fillField('Printing As Per Specs', obsData.printing ? "Yes" : "No");
      
      await fillField('Cable Physical Condition', obsData.physical ? "Smooth" : "Rough");
      
      if (obsData.ripcord) {
        const isObj = typeof obsData.ripcord === 'object';
        const hasRipcord = isObj ? obsData.ripcord.present : !!obsData.ripcord;
        
        await fillField('Ripcord Present', hasRipcord ? "Yes" : "No");
        await fillField('Ripcord No.', (isObj ? obsData.ripcord.count : "1") || "0");
      }
      
      await expandSection("Approvals / Status");
      await fillField('Tested By', techName);
    }
  }, { stage, obsData: data.observations, techName: data.technicianName });

  await hud.updateHUD(page, ["🧪 Observations completed"]);
  return true;
};