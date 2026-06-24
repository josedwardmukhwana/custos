import { Page, Frame } from "playwright";
import * as hud from "../utils/hud";

export const populateRecordHeader = async (page: Page, data: any, stage: string) => {
  const frameHandle = await page.waitForSelector("iframe.designer-client-frame", { timeout: 100000 });
  const frame = await frameHandle.contentFrame();
  if (!frame) throw new Error("❌ Unable to access iframe");

  const fields = getFieldsForStage(stage, data);

  for (const field of fields) {
    const value = String(field.value ?? "");
    await updateField(frame, field.label, value);
    await hud.updateHUD(page, [`✍️ ${field.key} updated`, `📄 Value: ${value}`]);
  }

  return true;
};

const getFieldsForStage = (stage: string, data: any) => {
  const common = [
    { key: "otdrNo", label: "OTDR No.", value: data.otdrNo },
    { key: "technicianName", label: "Technician Name", value: data.technicianName }
  ];

  switch (stage) {
    case "barefiber":
      return [...common, { key: "supplier", label: "Supplier", value: data.supplier }, { key: "fiberType", label: "Fiber Type", value: data.fiberType }];
    case "buffering":
      return [...common, { key: "shift", label: "Shift", value: data.shift }, { key: "equipmentID", label: "Equipment ID", value: data.equipmentID }];
    case "stranding":
      const minLength = data.fibers?.length > 0 ? Math.min(...data.fibers.map((f: any) => Number(f.length) || Infinity)) : 0;
      return [...common, { key: "shift", label: "Shift", value: data.shift }, { key: "equipmentID", label: "Equip ID", value: data.equipmentID }, { key: "lengthType", label: "Type Of Length", value: data.lengthType }, { key: "testSide", label: "Test Side", value: data.testSide }, { key: "minLength", label: "Optical Length (M)", value: minLength }];
    case "sheathing":
      const net = Number(data.netWeight) || 0;
      const drum = Number(data.drumWeight) || 0;
      return [...common, { key: "shift", label: "Shift", value: data.shift }, { key: "cableType", label: "Cable Type", value: data.cableType }, { key: "netWeight", label: "Net Weight Value", value: net }, { key: "drumWeight", label: "Drum Weight", value: drum }];
    default:
      return [];
  }
};

const updateField = async (frame: Frame, label: string, value: string) => {
  await frame.evaluate(async ({ ctrlName, val }) => {
    let container = document.querySelector(`div[controlname="${ctrlName}"]`);

    if (!container) {
      const allLabels = Array.from(document.querySelectorAll('a, label, span'));
      const targetLabel = allLabels.find(el => el.textContent?.trim().toLowerCase() === ctrlName.toLowerCase());
      container = targetLabel ? targetLabel.closest('div[controlname]') : null;
    }

    if (!container) throw new Error(`❌ Container for "${ctrlName}" not found`);

    const select = container.querySelector('select');
    
    if (select) {
      (select as HTMLSelectElement).value = val;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    else {
      const input = container.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) {
        input.focus();
        input.value = String(val).toUpperCase();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.blur();
      } else {
        throw new Error(`❌ Input/Dropdown for "${ctrlName}" not found`);
      }
    }
    await new Promise(r => setTimeout(r, 300));
  }, { ctrlName: label, val: value });
};