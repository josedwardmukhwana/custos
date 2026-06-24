import { chromium, Browser, Page } from "playwright"
import { logInit } from "../core/seishin"

let browser: Browser | null = null

export const initBrowser = async (): Promise<Page> => {
  await logInit()

  browser = await chromium.launch({
    headless: false,
    args: [
      "--start-maximized",
      "--disable-dev-shm-usage",
      // "--auto-open-devtools-for-tabs"
    ]
  })

  const context = await browser.newContext({
    viewport: null
  })

  const page = await context.newPage()

  page.setDefaultTimeout(600000)

  return page
}