import { z } from "zod"

export const stageSchema = z.enum([
  "barefiber",
  "buffering",
  "stranding",
  "sheathing"
])

export const queueTaskSchema = z.object({
  method: z.string().min(1),
  id: z.string().min(1),
  stage: stageSchema,
  content: z.any()
})