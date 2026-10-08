import { z } from "zod";
import { apiFetch } from "../../helpers/apiFetch";

export const schema = z.object({
  action: z.enum(["start", "submit"]),
  candidateId: z.string().min(1),
  /** true when the device submitted because the station time ran out */
  auto: z.boolean().optional(),
});

export const postExaminerStation = (token, body, init) =>
  apiFetch("examiner/station", {
    method: "POST",
    body: schema.parse(body),
    token,
    init,
  });
