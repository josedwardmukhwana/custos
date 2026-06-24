export type Stage = "barefiber" | "buffering" | "stranding" | "sheathing"

export type HUDStatus = "processing" | "error" | "restarting" | "idle"

export interface QueueTask {
  method: string
  id: string
  stage: Stage
  content: any
}

export interface FiberEntry {
  no: number
  "1310"?: string | number
  "1550"?: string | number
  length?: string | number
  remarks?: string
}

export interface BarefiberData {
  code: string
  supplier: string
  fiberType: string
  otdrNo: string | number
  technicianName: string
  fibers: FiberEntry[]
}

export interface BufferingObservations {
  id: number
  od: number
  thickness: number
  physical: boolean
  color: boolean
  jelly: boolean
  circular: boolean
  comment: string
}

export interface StrandingObservations {
  od: number
  frp: number
  csm: boolean
  filler: { present: boolean; count: number } | false
  yarns: Array<{ type: string; present: boolean; count: number }> | false
  tapes: Array<{ type: string; present: boolean; count: number }> | false
  comment: string
}

export interface SheathingObservations {
  od: number
  thickness: number
  printing: boolean
  yarn: string
  ripcord: { present: boolean; count: number } | false
  physical: boolean
}

export interface BufferingData {
  shift: string
  equipmentID: string
  otdrNo: string | number
  technicianName: string
  observations: BufferingObservations
  fibers: FiberEntry[]
}

export interface StrandingData {
  shift: string
  otdrNo: string | number
  lengthType: string
  equipmentID: string
  minLength: number
  testSide: string
  technicianName: string
  observations: StrandingObservations
  fibers: FiberEntry[]
}

export interface SheathingData {
  shift: string
  cableType: string
  otdrNo: string | number
  netWeight: string | number
  technicianName: string
  observations: SheathingObservations
  fibers: FiberEntry[]
}

export type AnyStageData =
  | BarefiberData
  | BufferingData
  | StrandingData
  | SheathingData

export type QueueWatcher = (list: QueueTask[], action: string) => void