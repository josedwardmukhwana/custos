import fs from "fs"
import path from "path"

export const log = (
  message: Record<string, string>,
  append: boolean = false,
  targetFile: string = "custos.log"
) => {
  const filePath = path.join(process.cwd(), targetFile)

  const now = new Date()
  const time = now.toLocaleTimeString("en-GB", { hour12: false })
  const date = now.toLocaleDateString("en-GB")

  const formatted = Object.entries(message)
    .map(([k, v]) => `[${k.toUpperCase()}]: ${v}`)
    .join(" | ")

  const entry = `[${time} - ${date}] => ${formatted}\n`

  try {
    if (append) {
      fs.appendFileSync(filePath, entry, "utf8")
    } else {
      fs.writeFileSync(filePath, entry, "utf8")
    }
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err))
  }
}