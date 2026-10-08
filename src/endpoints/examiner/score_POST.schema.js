import { z } from "zod";
import { apiFetch } from "../../helpers/apiFetch";

export const schema = z.object({
  candidateId: z.string().min(1),
  itemScores: z
    .array(
      z.object({
        checklistItemId: z.string().min(1),
        score: z.number().finite().min(0).nullable(),
      }),
    )
    .max(500)
    .default([]),
  components: z
    .array(
      z.object({
        component: z.enum(["project", "viva", "client_care"]),
        score: z.number().finite().min(0).nullable(),
        comment: z.string().max(2000).nullable().optional(),
      }),
    )
    .max(3)
    .default([]),
});

export const postExaminerScore = (token, body, init) =>
  apiFetch("examiner/score", {
    method: "POST",
    body: schema.parse(body),
    token,
    init,
  });
