import { z } from "zod";
import { apiFetch } from "../../helpers/apiFetch";
export const schema = z.object({});
export const postCandidateSubmit = (token, init) => apiFetch("candidate/submit", { method: "POST", body: {}, token, init });
