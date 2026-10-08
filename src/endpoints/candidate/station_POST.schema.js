import { z } from "zod";
import { apiFetch } from "../../helpers/apiFetch";
export const schema = z.object({
    action: z.enum(["start", "submit"]),
    stationNumber: z.number().int().min(1).max(6),
    /** true when the device submitted because the station time ran out */
    auto: z.boolean().optional(),
});
export const postCandidateStation = (token, body, init) => apiFetch("candidate/station", { method: "POST", body: schema.parse(body), token, init });
