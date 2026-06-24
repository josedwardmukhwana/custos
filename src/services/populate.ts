import { Page } from "playwright"
import { populateRecordHeader } from "../automation/populateRecordHeader"
import { populateRecordFibers } from "../automation/populateRecordFibers"
import { populateRecordObservations } from "../automation/populateRecordObservations"

export const populate = async (page: Page, stage: string, data: any) => {
  await populateRecordHeader(page, data, stage)

  if (data.fibers) {
    await populateRecordFibers(page, stage, data.fibers)
  }

  if (data.observations && stage !== "barefiber") {
    await populateRecordObservations(page, stage, data)
  }

  return true
}