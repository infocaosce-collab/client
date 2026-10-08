import { z } from "zod";
import { apiFetch } from "../../helpers/apiFetch";
export const schema = z.object({});
export const getCandidateExam = (token, init) => apiFetch("candidate/exam", { method: "GET", token, init });
