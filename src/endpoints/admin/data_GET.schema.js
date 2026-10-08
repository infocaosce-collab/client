import { z } from "zod";
import { apiFetch } from "../../helpers/apiFetch";
export const schema = z.object({});
export const getAdminData = (token, init) => apiFetch("admin/data", { method: "GET", token, init });
