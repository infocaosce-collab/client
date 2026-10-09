import { z } from "zod";
import { apiFetch } from "../../helpers/apiFetch";
export const schema = z.object({
    answers: z
        .array(z.object({
        questionId: z.string().min(1),
        selectedOption: z.string().regex(/^[A-Z]{1,3}$/).nullable(),
        /** When the device recorded the answer (server-clock estimate, ms). Lets offline work sync late. */
        at: z.number().optional(),
    }))
        .min(1)
        .max(1000),
});
export const postCandidateAnswer = (token, body, init) => apiFetch("candidate/answer", { method: "POST", body: schema.parse(body), token, init });
