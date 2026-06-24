import * as layout from "../utils/layout"
import * as hud from "../utils/hud"

export const logInit = async () => {
  layout.cs()
  layout.header()
  await layout.render(["🚀 Initializing Custos"])
}

export const logStatus = async (page: any, msg: string[]) => {
  await hud.updateHUD(page, msg)
  await layout.render(msg)
}