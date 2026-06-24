import { Page } from "playwright"

import * as movo from "./movo"
import * as layout from "../utils/layout"

let heartbeat: NodeJS.Timeout | null = null

export const startHeartbeat = (
  page: Page,
  onFailure: () => Promise<void>
) => {
  stopHeartbeat()

  heartbeat = setInterval(async () => {
    try {
      if (!page || page.isClosed()) {
        throw new Error("PAGE_CLOSED")
      }

      await movo.keepAlive(page)

      await layout.render(
        ["🫀 Heartbeat OK"],
        500,
        true,
        true
      )
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : String(err)

      await layout.render(
        [
          "💥 Heartbeat Failed",
          msg
        ],
        1000,
        true,
        true
      )

      stopHeartbeat()

      await onFailure()
    }
  }, 30000)
}

export const stopHeartbeat = () => {
  if (heartbeat) {
    clearInterval(heartbeat)
    heartbeat = null
  }
}