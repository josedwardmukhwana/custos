import express, {
  Request,
  Response,
  NextFunction
} from "express"

import { configure } from "../config/environment"

import { Page } from "playwright"

import { initBrowser } from "../services/browser"
import { movo } from "../services/movo"
import { auth } from "./auth"

import {
  startHeartbeat,
  stopHeartbeat
} from "../services/heartBeat"

import * as queue from "./queue"

import * as hud from "../utils/hud"
import * as layout from "../utils/layout"

const app = express()

app.use(express.json())

let page: Page | null = null

let booting = false

const recoverEngine = async () => {
  if (booting) {
    return
  }

  booting = true

  try {
    stopHeartbeat()

    if (page && !page.isClosed()) {
      try {
        await page.close()
      } catch {}
    }

    await layout.render([
      "🌐 Starting Engine"
    ])

    page = await initBrowser()

    if (!page) {
      throw new Error("Failed to initialize browser")
    }

    await movo(page)

    await auth(page)

    queue.setQueuePage(page)

    startHeartbeat(page, async () => {
      page = null

      await recoverEngine()
    })

    await layout.render([
      "✅ Engine Ready"
    ])

    booting = false
  } catch (err) {
    booting = false

    const msg =
      err instanceof Error
        ? err.message
        : String(err)

    await layout.render([
      "❌ Engine Recovery Failed",
      msg
    ])

    if (page && !page.isClosed()) {
      await hud.updateHUD(page!, [
        "❌ Engine Recovery Failed",
        msg
      ])
    }

    throw err
  }
}

app.use(
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (page && !page.isClosed()) {
        return next()
      }

      if (booting) {
        return res.status(503).json({
          success: false,
          message: "Engine restarting"
        })
      }

      await recoverEngine()

      if (!page || page.isClosed()) {
        return res.status(503).json({
          success: false,
          message: "Engine unavailable"
        })
      }

      next()
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : String(err)

      await layout.render([
        "❌ Middleware Recovery Failed",
        msg
      ])

      return res.status(503).json({
        success: false,
        message: "Recovery failed"
      })
    }
  }
)

app.post(
  "/record",
  async (req: Request, res: Response) => {
    try {
      const {
        id,
        stage,
        content
      } = req.body

      if (!id || !stage || !content) {
        throw new Error(
          "Missing required fields"
        )
      }

      queue.queueTask({
        id,
        stage,
        content,
        method: req.method
      })

      return res.status(200).json({
        success: true,
        message: `${id} queued`,
        queue: queue.getLength()
      })
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : String(err)

      await layout.log(
        {
          title: "QUEUE_ERROR",
          method: req.method,
          content: msg
        },
        true
      )

      return res.status(500).json({
        success: false,
        message: "Queue failed"
      })
    }
  }
)

const startServer = async () => {
  try {
    await configure()

    await recoverEngine()

    const PORT = Number(process.env.PORT || 3000)

    app.listen(PORT, async () => {
      await layout.render([
        `🚀 Server running on ${PORT}`
      ])

      queue.startQueueWatcher(
        async (list, action) => {
          const ids = list
            .map((t: any) => t.id)
            .join(", ")

          await layout.render([
            `[QUEUE] ${action}`,
            `[QUEUE] ${
              ids || "EMPTY"
            }`
          ])

          if (!queue.getStatus()) {
            queue.processQueue()
          }
        }
      )
    })
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : String(err)

    await layout.render([
      "⚠️ SERVER FAILURE",
      msg,
      "Retrying in 5s"
    ])

    setTimeout(startServer, 5000)
  }
}

startServer()