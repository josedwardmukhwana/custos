import { Page } from "playwright"

import * as layout from "../utils/layout"
import * as hud from "../utils/hud"

export const movo = async (
  page: Page,
  target?: string
): Promise<void> => {
  const environment: {  SITE: string | null } = {
    SITE: process.env.ERP_SITE ?? null
  }

  if (!environment.SITE) {
    throw new Error("Missing environment variables")
  }

  if (!page || page.isClosed()) {
    throw new Error("Target page unavailable")
  }

  const url = target ?? environment.SITE

  const label =
    url.toLowerCase() === environment.SITE.toLowerCase()
      ? "ERP site"
      : url

  await layout.render([`🌐 Navigating to ${label}`])

  await hud.updateHUD(page, [
    `🌐 Navigating to ${label}`
  ])

  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60000
  })

  if (!response) {
    throw new Error("Navigation failed")
  }

  await page.waitForLoadState("networkidle")
}

export const keepAlive = async (
  page: Page
): Promise<void> => {
  if (!page || page.isClosed()) {
    throw new Error("Page unavailable")
  }

  await page.mouse.move(
    Math.random() * 50,
    Math.random() * 50
  )

  const status = await page.evaluate(() => {
    const loginField = document.querySelector("#UserName")

    if (loginField) {
      return "LOGOUT"
    }

    const hudRoot = document.getElementById("custos-hud")

    if (!hudRoot) {
      return "INJECT_REQUIRED"
    }

    const statusEl = document.getElementById("hud-status")

    if (statusEl) {
      statusEl.style.color =
        statusEl.style.color === "rgb(0, 255, 65)"
          ? "#ffff00"
          : "#00ff41"
    }

    return "ALIVE"
  })

  if (status === "LOGOUT") {
    await layout.log(
      {
        title: "SESSION",
        content: "ERP session expired"
      },
      true
    )

    throw new Error("SESSION_EXPIRED")
  }

  if (status === "INJECT_REQUIRED") {
    await hud.injectHUD(page)

    await hud.updateHUD(
      page,
      ["💤 Idle"],
      "idle"
    )
  }
}