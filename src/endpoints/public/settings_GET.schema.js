import { z } from "zod";
import { apiFetch } from "../../helpers/apiFetch";
export const schema = z.object({});
export const getPublicSettings = (init) => apiFetch("public/settings", { method: "GET", init });
