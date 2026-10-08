import { z } from "zod";
import { apiFetch } from "../../helpers/apiFetch";
export const schema = z.object({});
export const postLogout = (token, init) => apiFetch("auth/logout", { method: "POST", body: {}, token, init });
