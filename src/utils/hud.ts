import { Page } from "playwright"

type HUDStatus = "processing" | "error" | "restarting" | "idle"

const STATUS_MAP = {
  processing: { label: "PROCESSING", color: "#00ff41", icon: "🟢" },
  error: { label: "ERROR", color: "#ff4444", icon: "🔴" },
  restarting: { label: "RESTARTING", color: "#44aaff", icon: "🔵" },
  idle: { label: "IDLE", color: "#ffbb00", icon: "🟡" }
}

export const injectHUD = async (page: Page) => {
  if (!page) throw new Error("Page required")

  await page.evaluate(() => {
    let hud = document.getElementById("custos-hud")

    if (!hud) {
      hud = document.createElement("div")
      hud.id = "custos-hud"
      document.body.appendChild(hud)
    }

    Object.assign(hud.style, {
      position: "fixed",
      top: "1em",
      right: "0.5em",
      width: "30vw",
      maxHeight: "40vh",
      display: "flex",
      flexDirection: "column",
      background: "rgba(20,20,20,0.92)",
      color: "#00ff41",
      padding: "0.8em",
      borderRadius: "0.3em",
      fontFamily: "Consolas, monospace",
      fontSize: "13px",
      zIndex: "2147483647",
      boxShadow: "0 10px 40px rgba(0,0,0,0.9)",
      borderLeft: "4px solid #00ff41",
      pointerEvents: "none",
      boxSizing: "border-box"
    })

    hud.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#888;margin-bottom:10px;">
        <span>Custos v2026</span>
        <span>
          <span id="hud-status-icon">🟢</span>
          <span id="hud-status-text">PROCESSING</span>
        </span>
      </div>
      <div id="hud-content" style="overflow-y:auto;flex:1;"></div>
    `
  })
}

export const updateHUD = async (
  page: Page,
  messages: string[] = [],
  status: HUDStatus = "processing",
  delayMs: number = 500,
  stack: boolean = true,
  interval: number = 1000
) => {
  if (!page) throw new Error("Page required")

  const exists = await page.evaluate(() => !!document.getElementById("custos-hud"))
  if (!exists) await injectHUD(page)

  const config = STATUS_MAP[status]

  await page.evaluate(
    ({ msgs, cfg, shouldStack, showInterval }) => {
      const hud = document.getElementById("custos-hud")
      const content = document.getElementById("hud-content")
      const icon = document.getElementById("hud-status-icon")
      const text = document.getElementById("hud-status-text")

      if (hud) {
        hud.style.borderLeftColor = cfg.color
        hud.style.color = cfg.color
      }
      if (icon) icon.textContent = cfg.icon
      if (text) text.textContent = cfg.label

      if (content && msgs.length > 0) {
        if (shouldStack) {
          content.innerHTML = msgs
            .map(m => `<div style="margin-bottom:4px">${m}</div>`)
            .join("")
        } else {
          let i = 0
          const render = () => {
            if (i < msgs.length) {
              content.innerHTML = `<div style="margin-bottom:4px">${msgs[i]}</div>`
              i++
              setTimeout(render, showInterval)
            }
          }
          render()
        }
        content.scrollTop = content.scrollHeight
      }
    },
    { msgs: messages, cfg: config, shouldStack: stack, showInterval: interval }
  )

  await new Promise(r => setTimeout(r, delayMs))
}

export const toTitleCase = function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}