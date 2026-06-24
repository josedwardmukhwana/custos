import { Page, Frame } from "playwright";
import * as hud from "../utils/hud";

export const populateRecordFibers = async (page: Page, stage: string, fibers: any[]) => {
  const frameHandle = await page.waitForSelector("iframe.designer-client-frame", { timeout: 100000 });
  const frame = await frameHandle.contentFrame();
  if (!frame) throw new Error("❌ Unable to access iframe");

  if (stage === "barefiber") {
    await populateGridBareFibers(frame, page, fibers);
  } else {
    await populateGridFibers(frame, page, stage, fibers);
  }

  return true;
};

const populateGridBareFibers = async (frame: Frame, page: Page, fibers: any[]) => {
  for (const fiber of fibers) {
    let rows: any[] = await frame.$$('table caption:has-text("Bare Fibre Testing Lines") >> xpath=../.. >> tbody tr');
    const maxAttempts = 10;
    let notifyUserCreateRows = true;

    if (notifyUserCreateRows && rows.length < 1) {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        rows = await frame.$$('table caption:has-text("Bare Fibre Testing Lines") >> xpath=../.. >> tbody tr');

        if (rows.length < 1) {
          await hud.updateHUD(page, [
            "❌ Bare Fiber rows not found",
            "➕ Add a row in Bare Fibre Testing Lines",
            "⏲️ Retrying in 5s",
            "⏳ Attempt " + (attempt + 1) + "/" + maxAttempts,
          ], "idle", 5000);
        } else {
          await hud.updateHUD(page, [ `📊 Found ${rows.length} rows to process`]);
          notifyUserCreateRows = false;
          break;
        }
      }
    }

    await frame.evaluate(async(args) => {

      const { fiber, index } = args;
      const spoolId = String(fiber.no).trim().split(" ")[0];
      const color = String(fiber.no).trim().split(" ")[1];

      if  (!spoolId || !color) throw new Error(`❌ Invalid fiber identifier: "${fiber.no}". Expected format: "ID COLOR"`);
      
      const table = Array.from(document.querySelectorAll('table')).find(t => {
        const caption = t.querySelector('caption');
        return caption && caption.textContent?.trim().toLowerCase() === 'bare fibre testing lines';
      });

      if (!table) throw new Error("❌ Bare Fiber table not found");

      const getRows: Function = async(): Promise<Array<HTMLTableRowElement>> => Array.from(table.querySelectorAll('tbody tr'));

      const fieldMap = [
        { key: 'spoolID', control: "Spool Id", value: spoolId },
        { key: 'fiberColor', control: "Fibre Color", value: color },
        { key: '1310', control: "1310nm", value: fiber['1310'] },
        { key: '1550', control: "1550nm", value: fiber['1550'] },
        { key: 'length', control: "Fibre Length", value: fiber['length'] },
        { key: 'event', control: "Event Count", value: fiber['event'] ?? 0 }
      ]

      let targetRow = null;

      const rows = await getRows();
      if (index > 34) {
        let activeElement = document.activeElement instanceof HTMLInputElement ? document.activeElement : null;
        if (activeElement) {
          targetRow = (activeElement.parentElement?.parentElement ?? rows[rows.length - 1]) as HTMLTableRowElement;
        }
        else targetRow = rows[rows.length - 1] as HTMLTableRowElement;

      }
      else targetRow = rows[index]  as HTMLTableRowElement;
      

      for (const field of fieldMap) {
        const cell = targetRow ? Array.from(targetRow.querySelectorAll('td')).find(cell => 
          cell.getAttribute('controlname')?.trim() === field.control
        ) as HTMLElement : null;
        
        const value = field.value;
        if (cell && value !== undefined) {
          cell.click();
          await new Promise(r => setTimeout(r, 100));
          let input = cell.querySelector('input') as HTMLInputElement ?? null;
          if (input) {
            input.focus();
            input.value = String(value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.blur()

            if (field.key.trim().toLowerCase() === 'length') {
              const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
              });

              const remarksCell = targetRow ? Array.from(targetRow.querySelectorAll('td')).find(cell => 
                cell.getAttribute('controlname')?.trim().toLowerCase() === 'remarks') as HTMLElement : null;
              
              if (remarksCell) remarksCell.click();
              await new Promise(r => setTimeout(r, 50));

              input = remarksCell?.querySelector('input') as HTMLInputElement ?? null;
              if (input) {
                input.focus();
                input.dispatchEvent(enterEvent);
                await new Promise(r => setTimeout(r, 50));
              }

              input.blur();
            }

            await new Promise(r => setTimeout(r, 50));
          }
        }
      }
    }, { fiber, index: fibers.indexOf(fiber)});

    await hud.updateHUD(page, [`✨ Bare Fiber ${fiber.no} updated at row ${fibers.indexOf(fiber) + 1}`]);
  }
};

const populateGridFibers = async (frame: Frame, page: Page, stage: string, fibers: any[]) => {
  const stageConfigs: Record<string, { controlName: string; captionName: string }> = {
    buffering: { controlName: "After Buffering Test Card", captionName: "tube test results" },
    stranding: { controlName: "OTDR Results Subpage", captionName: "fiber lines" },
    sheathing: { controlName: "Sheathing Prod Test Lines", captionName: "otdr lines" }
  };

  const config = stageConfigs[stage.toLowerCase()];
  if (!config) throw new Error(`❌ Unrecognized stage: "${stage}"`);
  let populatedFibers: Array<any> = fibers;

  for (const fiber of populatedFibers) {
    await frame.evaluate(async (args) => {
      const { data, controlName, captionName, stage } = args;

      const getTableContainer = () => document.querySelector(`div[controlname="${controlName}"]`);
      const getRows = () => Array.from(getTableContainer()?.querySelectorAll('tbody tr') || []);

      const findTargetRow = async () => {
        const maxRetries = 10;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const rows = getRows();
          
          for (const row of rows) {
            const cells = Array.from(row.querySelectorAll('td'));
            const isMatch = cells.some(cell => cell.textContent?.trim() === String(data.no));
            
            if (isMatch) return row;

            const rowNoInput = row.querySelector('td[controlname="Fiber No."] input') as HTMLInputElement;
            if (rowNoInput && String(rowNoInput.value).trim() === String(data.no)) {
              return row;
            }
          }
          
          await new Promise(r => setTimeout(r, 500));
        }
        
        return null;
      };

      let targetRow = await findTargetRow();

      if (!targetRow) throw new Error(`Fiber ${data.no} not found.`);

      targetRow.scrollIntoView({ block: "center" });
      const rowHeader = targetRow.querySelector('td[role="rowheader"]') as HTMLElement;
      if (rowHeader) {
        rowHeader.click();
        await new Promise(r => setTimeout(r, 500));
      }

      targetRow = await findTargetRow();
      if (!targetRow) throw new Error(`Lost reference to Fiber ${data.no} after click.`);

      const stageLengthControl: Record<string, Record<string, string>> = {
        buffering: {wave_1310nm: "1310nm", wave_1550nm: "1550nm", length: "MEASURED F.LENGTH"},
        stranding: {wave_1310nm: "OTDR 1310 (dB/km)", wave_1550nm: "OTDR 1550 (dB/km)", length: "Exact F. Length (M)"},
        sheathing: {wave_1310nm: "OTDR 1310 (dB/km)", wave_1550nm: "OTDR 1550 (dB/km)", length: "Length (M)"}
      };
      const fieldMap = [
        { key: '1310', control: stageLengthControl[stage].wave_1310nm },
        { key: '1550', control: stageLengthControl[stage].wave_1550nm },
        { key: 'length', control: stageLengthControl[stage].length }
      ];

      for (const field of fieldMap) {
        const cell = Array.from(targetRow.querySelectorAll('td')).find(c => 
          c.getAttribute('controlname')?.trim() === field.control
        ) as HTMLElement;
        
        const value = data[field.key as keyof typeof data];
        if (cell && value !== undefined) {
          cell.click();
          await new Promise(r => setTimeout(r, 100));
          const input = cell.querySelector('input');
          if (input) {
            input.focus();
            input.value = String(value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.blur();
            await new Promise(r => setTimeout(r, 50));
          }
        }
      }
    }, { data: fiber, controlName: config.controlName, captionName: config.captionName, stage });

    await hud.updateHUD(page, [`✅ Fiber ${fiber.no} updated`]);

    populatedFibers = populatedFibers.filter(f => f.no !== fiber.no);
  }
};