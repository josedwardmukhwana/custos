import { Page } from "playwright"
import * as hud from "../utils/hud"
import * as layout from "../utils/layout"

export const getRecords = async (
  page: Page,
  searchText: string
): Promise<boolean> => {
  const frameHandle = await page.waitForSelector("iframe.designer-client-frame", {
    timeout: 100000
  })

  const frame = await frameHandle.contentFrame()
  if (!frame) throw new Error("❌ Unable to access iframe")

  const query = searchText.toLowerCase()

  await hud.updateHUD(page, [`🔍 Searching for ${query.toUpperCase()}`])

  const container = frame.locator(".search-box-container--1aOM57_7nkghJ4mG2z5f_O")
  const input = frame.locator("input.ms-SearchBox-field")

  await container.waitFor({ state: "visible", timeout: 15000 })

  await container.click({ force: true })
  await frame.waitForTimeout(100)

  await input.click({ force: true })
  await frame.waitForTimeout(100)

  await input.fill("")
  await input.type(query.toUpperCase(), { delay: 50 })

  await input.press("Enter")

  await hud.updateHUD(page, [`⏳ Waiting for results`])

  await layout.render([
    `🔍 Searching ${hud.toTitleCase(query)}`,
    `⏳ Waiting for results...`
  ])

  await frame.waitForTimeout(1200)

  const found = await frame.evaluate((query) => {
    const rows = Array.from(document.querySelectorAll("table tbody tr"))

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("td"))
      const match = cells.some(td =>
        td.innerText.trim().toLowerCase().includes(query)
      )

      if (match) {
        const link = row.querySelector("a.stringcontrol-read, a[role='button']") as HTMLElement

        if (!link) return false

        row.scrollIntoView({ block: "center" })

        const events = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]

        for (const type of events) {
          link.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              view: window,
              buttons: 1
            })
          )
        }

        return true
      }
    }

    return false
  }, query)

  if (found) {
    await hud.updateHUD(page, [`✨ Found ${query.toUpperCase()}`, `🎯 Successfully opened ${query.toUpperCase()}`], "processing", 2050, false, 1000)
    await layout.render([`✨ Found ${query.toUpperCase()}`,`⏳ Opening record ${query.toUpperCase()}`,`🎯 Successfully opened ${query.toUpperCase()}`], 1000)
    return true
  }

  await hud.updateHUD(page, [`❌ Record ${query.toUpperCase()} not found`])
  return false
}