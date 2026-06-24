import { Page } from "playwright"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import * as layout from "../utils/layout"
import * as hud from "../utils/hud"
import { populate } from "../services/populate"
import { menu } from "../navigation/menu"
import { getRecords } from "../automation/getRecord"
import { movo } from "../services/movo"
import { queueTaskSchema } from "../utils/schemas"

interface QueueTask {
  method: string
  id: string
  stage: "barefiber" | "buffering" | "stranding" | "sheathing"
  content: any
}

const BASE_DIR = path.join(process.cwd(), "media", "files")
const QUEUE_FILE = path.join(BASE_DIR, "custos.queue.enc")
const DLQ_FILE = path.join(BASE_DIR, "custos.dlq.enc")

const KEY = crypto.createHash("sha256").update(process.env.CUSTOS_SECRET || "default").digest()
const ALGO = "aes-256-gcm"

let queue: QueueTask[] = []
let dlq: (QueueTask & { _attempts?: number })[] = []

let page: Page | null = null
let processing = false

type Watcher = (list: QueueTask[], action: string) => void
let watcher: Watcher | null = null

const retryMap = new Map<string, number>()
const MAX_RETRIES = 3
const MAX_DLQ_RETRIES = 2
const DLQ_INTERVAL = 15000

const ensureDir = () => {
  if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true })
}

const encrypt = (data: string) => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGO, KEY, iv)
  let enc = cipher.update(data, "utf8", "hex")
  enc += cipher.final("hex")
  const tag = cipher.getAuthTag()
  return JSON.stringify({
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    data: enc
  })
}

const decrypt = (data: string) => {
  const parsed = JSON.parse(data)
  const decipher = crypto.createDecipheriv(
    ALGO,
    KEY,
    Buffer.from(parsed.iv, "hex")
  )
  decipher.setAuthTag(Buffer.from(parsed.tag, "hex"))
  let dec = decipher.update(parsed.data, "hex", "utf8")
  dec += decipher.final("utf8")
  return dec
}

const save = (file: string, data: any) => {
  ensureDir()
  fs.writeFileSync(file, encrypt(JSON.stringify(data)), "utf8")
}

const load = (file: string) => {
  try {
    if (!fs.existsSync(file)) return []
    return JSON.parse(decrypt(fs.readFileSync(file, "utf8")))
  } catch {
    return []
  }
}

const persist = () => {
  save(QUEUE_FILE, queue)
  save(DLQ_FILE, dlq)
}

const notify = (action: string) => {
  if (watcher) watcher([...queue], action)
  persist()
}

export const startQueueWatcher = (cb: Watcher) => {
  watcher = cb
}

export const setQueuePage = (p: Page) => {
  page = p
}

export const queueTask = (task: any) => {
  const parsed = queueTaskSchema.safeParse(task)
  if (!parsed.success) {
    layout.log(
      { title: "INVALID TASK", content: JSON.stringify(parsed.error.flatten()) },
      true,
      path.join(BASE_DIR, "custos.errors")
    )
    return
  }

  queue.push(parsed.data)
  notify("push")
}

export const getLength = () => queue.length
export const getStatus = () => processing

const moveToDLQ = (task: QueueTask, reason: string) => {
  dlq.push({ ...task, content: { ...task.content, _error: reason }, _attempts: 0 })
  persist()

  layout.log(
    { title: "DLQ MOVE", content: `${task.id} => ${reason}` },
    true,
    path.join(BASE_DIR, "custos.dlq")
  )
}

const retryTask = (task: QueueTask) => {
  const count = retryMap.get(task.id) || 0
  retryMap.set(task.id, count + 1)

  if (count + 1 >= MAX_RETRIES) {
    moveToDLQ(task, "MAX_RETRIES")
    return false
  }

  queue.push(task)
  notify("retry")
  return true
}

const processDLQ = async () => {
  if (!page || dlq.length === 0) return

  await hud.updateHUD(page, [`🔄 Processing ${dlq.length} items from DLQ`]);

  const snapshot = [...dlq]
  dlq = []

  for (const task of snapshot) {
    const attempts = (task as any)._attempts || 0

    if (attempts >= MAX_DLQ_RETRIES) {
      layout.log(
        { title: "DLQ FINAL DROP", content: task.id },
        true,
        path.join(BASE_DIR, "custos.dlq")
      )
      continue
    }

    try {
      queue.push(task)
      notify("dlq-requeue")

      layout.log(
        { title: "DLQ RETRY", content: task.id },
        true,
        path.join(BASE_DIR, "custos.dlq")
      )
    } catch {
      dlq.push({ ...task, _attempts: attempts + 1 })
    }
  }

  persist()
}

const startDLQWorker = () => {
  setInterval(async () => {
    if (processing) return
    await processDLQ()
  }, DLQ_INTERVAL)
}

export const processQueue = async () => {
  if (processing || !page || queue.length === 0) return

  processing = true
  startDLQWorker()

  while (queue.length > 0) {
    const task = queue[0]
    let success = false
    let errorOccurred = false

    try {
      await hud.updateHUD(page, [
        `⚡ Processing: ${task.id}`, 
        `📋 Remaining: ${queue.length - 1}`
      ]);

      await layout.render([
        `⚙️ System: Active`, 
        `📊 Status: Processing ${task.id}`, 
        `📋 Queue: ${queue.length - 1} items`
      ]);

      await menu(task.stage, page)
      const data = buildTemplate(task)
      success = await getRecords(page, task.id)
      if (!success) throw new Error("NOT FOUND")
      await populate(page, task.stage, data)
      await hud.updateHUD(page, [`✅ Done ${task.id}`])
    } catch (err) {
      errorOccurred = true
      const msg = err instanceof Error ? err.message : String(err)

      layout.log({ title: "QUEUE ERROR", content: `${task.id} => ${msg}` }, true, path.join(BASE_DIR, "custos.errors"))

      try {
        if (page && !page.isClosed()) {
          await hud.updateHUD(page, [`❌ Failed ${task.id}`, msg, 'Resuming in 10s'], "error", 10000) 
        }
      } catch (hudErr) {
        layout.log({ title: "HUD ERROR IN CATCH", content: `Failed to update HUD: ${String(hudErr)}` }, true, path.join(BASE_DIR, "custos.errors"))
      }

      const ok = retryTask(task)
      if (!ok) success = false
    } finally {
      const done = queue.shift()
      notify("shift")

      if (!errorOccurred) {
        await new Promise(r => setTimeout(r, 2000))
      }

      try {
        if (page && !page.isClosed()) {
          await hud.updateHUD(page, ["⚛️ RESET"])
          await movo(page)
        }
      } catch (finallyErr) {
        layout.log({ title: "FINALLY NAVIGATION ERROR", content: `Failed finally navigation: ${String(finallyErr)}` }, true, path.join(BASE_DIR, "custos.errors"))
      }
    }
  }

  processing = false
  persist()
  await layout.render(["✅ Queue Completed"])
  
  try {
    if (page && !page.isClosed()) {
      await hud.updateHUD(page, ["💤 Idle"], "idle")
    }
  } catch {}
}

const buildTemplate = (task: QueueTask) => {
  const c = task.content

  switch (task.stage) {
    case "barefiber":
      return {
        code: String(c.code).toUpperCase(),
        supplier: String(c.supplier).toUpperCase(),
        fiberType: String(c.fiber_Type).toUpperCase(),
        otdrNo: String(c.otdr_No).toUpperCase(),
        technicianName: String(c.technician_Name).toUpperCase(),
        fibers: c.fibers
      }

    case "buffering":
      return {
        shift: String(c.shift).toUpperCase(),
        equipmentID: String(c.equipment_ID).toUpperCase(),
        otdrNo: String(c.otdr_No).toUpperCase(),
        technicianName: String(c.technician_Name).toUpperCase(),
        observations: {
          id: String(c.observations.id ?? ""),
          od: c.observations.od,
          thickness: c.observations.thickness,
          physical: !!c.observations.physical,
          color: !!c.observations.color,
          jelly: !!c.observations.jelly,
          circular: !!c.observations.circular,
          comment: String(c.comment ?? "").toUpperCase()
        },
        fibers: c.fibers
      }

    case "stranding":
      return {
        shift: String(c.shift).toUpperCase(),
        otdrNo: String(c.otdr_No).toUpperCase(),
        technicianName: String(c.technician_Name).toUpperCase(),
        equipmentID: String(c.equipment_ID).toUpperCase(),
        lengthType: String(c.length_Type).toUpperCase(),
        testSide: String(c.test_Side).toUpperCase(),
        observations: {
          od: c.observations.od,
          frp: c.observations.frp,
          csm: c.observations.csm,
          filler: c.observations.filler,
          yarns: c.observations.yarns,
          tapes: c.observations.tapes,
          comment: String(c.comment).toUpperCase()
        },
        fibers: c.fibers
      }

    case "sheathing":
      return {
        shift: String(c.shift).toUpperCase(),
        otdrNo: String(c.otdr_No).toUpperCase(),
        cableType: String(c.cable_Type).toUpperCase(),
        technicianName: String(c.technician_Name).toUpperCase(),
        netWeight: c.net_Weight,
        drumWeight: c.drum_Weight,
        observations: {
          od: c.observations.od,
          thickness: c.observations.thickness,
          printing: c.observations.printing,
          yarn: c.observations.yarn,
          ripcord: c.observations.ripcord || false,
          physical: c.observations.physical
        },
        fibers: c.fibers
      }

    default:
      throw new Error("Invalid stage")
  }
}