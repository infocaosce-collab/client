import { z } from "zod";
import { apiFetch } from "../../helpers/apiFetch";
export const schema = z.object({});
export const getAdminResults = (token, init) => apiFetch("admin/results", { method: "GET", token, init });
