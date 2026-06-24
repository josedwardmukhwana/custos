import { Page } from "playwright"
import * as hud from "../utils/hud"
import * as layout from "../utils/layout"


export const auth = async (page: Page) => {
  const environment: { USERNAME: string | null; PASSWORD: string | null } = {
    USERNAME: process.env.ERP_USERNAME ?? null,
    PASSWORD: process.env.ERP_PASSWORD ?? null
  }

  if (!environment.USERNAME || !environment.PASSWORD) {
    throw new Error("Missing environment variables")
  }

  await hud.injectHUD(page)

  await hud.updateHUD(page, ["🔐 Authenticating user"])
  await layout.render(["🔐 Authenticating user"])

  const startUrl = page.url()

  await page.waitForSelector("#UserName", { timeout: 10000 })

  await page.fill("#UserName", environment.USERNAME)
  await page.fill("#Password", environment.PASSWORD)

  await Promise.all([
    page.click("#submitButton"),
    page.waitForLoadState("networkidle", { timeout: 30000 })
  ])

  await page.waitForFunction(() => document.readyState === "complete")

  const endUrl = page.url()
  const stillLogin = await page.$("#submitButton")

  if (startUrl === endUrl || stillLogin) {
    await hud.updateHUD(page, ["❌ Authentication failed"], "error")
    throw new Error("Authentication failed")
  }

  await layout.render(["✅ User successfully authenticated"])

  await hud.injectHUD(page)

  await hud.updateHUD(
    page,
    ["💤 Idle"],
    "idle"
  )
}