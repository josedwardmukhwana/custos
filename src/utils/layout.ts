import readline from "readline"
import fs from "fs"
import path from "path"

let fixed: string[] = []

const HEADER_HEIGHT = 3
const DEFAULT_DELAY = 500

const getAppRootDir = () => {
  let currentDir = __dirname
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(currentDir, "media"))) {
      return currentDir
    }
    const parent = path.dirname(currentDir)
    if (parent === currentDir) break
    currentDir = parent
  }
  return process.cwd()
}

const line = (c = "─") =>
  c.repeat(process.stdout.columns || 80)

export const cs = () => {
  process.stdout.write("\x1Bc")
}

export const header = () => {
  const width = process.stdout.columns || 80
  const title = `Custos ${new Date().getFullYear()}`

  const pad = Math.max(0, Math.floor((width - title.length) / 2))

  console.log(line())
  console.log(" ".repeat(pad) + title)
  console.log(line())
}

export const log = (msg: any, stack = false, file = "custos.log") => {
  const rootDir = getAppRootDir()
  const absolutePath = path.isAbsolute(file) ? file : path.join(rootDir, file)

  try {
    const dir = path.dirname(absolutePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    if (!fs.existsSync(absolutePath)) {
      fs.writeFileSync(absolutePath, "", "utf8")
    }
  } catch (err) {
    console.error(err)
  }

  const relativeFile = path.isAbsolute(file) ? path.relative(rootDir, file) : file
  const { log } = require("./logger")
  log(msg, stack, relativeFile)
}

const renderFixed = () => {
  if (fixed.length) {
    fixed.forEach(l => console.log(l))
    console.log(line())
  }
}

export const render = async (
  content: string[],
  delay = DEFAULT_DELAY,
  border = false,
  stack = false,
  fixedMode = false
) => {
  if (fixedMode) fixed = [...content]

  if (stack) {
    readline.cursorTo(process.stdout, 0, HEADER_HEIGHT)
    readline.clearScreenDown(process.stdout)

    renderFixed()

    if (!fixedMode) {
      content.forEach(c => {
        console.log(c)
        if (border) console.log(line())
      })
    }

    return
  }

  for (const c of content) {
    readline.cursorTo(process.stdout, 0, HEADER_HEIGHT)
    readline.clearScreenDown(process.stdout)

    renderFixed()

    console.log(c)
    if (border) console.log(line())

    await new Promise(r => setTimeout(r, delay))
  }
}