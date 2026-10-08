import { z } from "zod";
import { apiFetch } from "../../helpers/apiFetch";
export const schema = z.discriminatedUnion("role", [
    z.object({ role: z.literal("admin"), password: z.string().min(1, "Enter the password") }),
    z.object({
        role: z.literal("admin_setup"),
        password: z.string().min(6, "Use at least 6 characters"),
    }),
    z.object({
        role: z.literal("examiner"),
        username: z.string().trim().min(1, "Enter your username"),
        pin: z.string().trim().min(1, "Enter your PIN"),
    }),
    z.object({
        role: z.literal("candidate"),
        examNumber: z.string().trim().min(1, "Enter your exam number"),
        pin: z.string().trim().min(1, "Enter your PIN"),
    }),
]);
export const postLogin = (body, init) => apiFetch("auth/login", { method: "POST", body: schema.parse(body), init });
