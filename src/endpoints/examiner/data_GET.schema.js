import { z } from "zod";
import { apiFetch } from "../../helpers/apiFetch";
export const schema = z.object({});
export const getExaminerData = (token, init) => apiFetch("examiner/data", { method: "GET", token, init });
