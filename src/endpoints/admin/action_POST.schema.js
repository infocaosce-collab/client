import { z } from "zod";
import { apiFetch } from "../../helpers/apiFetch";
const optionLetter = z.enum(["A", "B", "C", "D", "E"]);
const componentEnum = z.enum(["project", "viva", "client_care"]);
const importMode = z.enum(["append", "replace"]);
const nonNeg = z.number().finite().min(0);
const mongoId = z.string().min(1);
export const candidateRow = z.object({
    examNumber: z.string().trim().min(1).max(60),
    fullName: z.string().trim().min(1).max(200),
    pin: z.string().trim().max(30).optional(),
});
export const checklistRow = z.object({
    stationNumber: z.union([z.literal(1), z.literal(3), z.literal(5)]),
    description: z.string().trim().min(1).max(2000),
    maxScore: nonNeg.max(1000),
});
export const questionRow = z.object({
    stationNumber: z.union([z.literal(2), z.literal(4), z.literal(6)]),
    questionText: z.string().trim().min(1).max(5000),
    optionA: z.string().trim().min(1).max(1000),
    optionB: z.string().trim().min(1).max(1000),
    optionC: z.string().trim().max(1000).nullable().optional(),
    optionD: z.string().trim().max(1000).nullable().optional(),
    optionE: z.string().trim().max(1000).nullable().optional(),
    correctOption: optionLetter,
    marks: nonNeg.max(1000),
});
export const schema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("updateSettings"),
        institutionName: z.string().trim().min(1).max(200).optional(),
        logoUrl: z.string().max(1500000).nullable().optional(),
        examTitle: z.string().trim().min(1).max(200).optional(),
        durationMinutes: z.number().int().min(1).max(1440).optional(),
        endButtonLabel: z.string().trim().min(1).max(40).optional(),
        projectMax: nonNeg.max(1000).optional(),
        vivaMax: nonNeg.max(1000).optional(),
        clientCareMax: nonNeg.max(1000).optional(),
        candidateAccessOpen: z.boolean().optional(),
        examinerAccessOpen: z.boolean().optional(),
    }),
    z.object({
        action: z.literal("updateStation"),
        number: z.number().int().min(1).max(6),
        title: z.string().trim().min(1).max(200),
        instructions: z.string().max(5000).nullable(),
        durationMinutes: z.number().int().min(1).max(600).optional(),
    }),
    z.object({
        action: z.literal("resetStationAttempt"),
        candidateId: mongoId,
        stationNumber: z.number().int().min(1).max(6),
    }),
    z.object({
        action: z.literal("extendStationAttempt"),
        candidateId: mongoId,
        stationNumber: z.number().int().min(1).max(6),
        minutes: z.number().int().min(1).max(120),
    }),
    z.object({
        action: z.literal("clearSubmission"),
        candidateId: mongoId,
        /** Stations whose answers/checklist marks and timer are wiped so the candidate can retake them. */
        stations: z.array(z.number().int().min(1).max(6)).min(1).max(6),
    }),
    z.object({ action: z.literal("importCandidates"), mode: importMode, rows: z.array(candidateRow).min(1).max(5000) }),
    z.object({ action: z.literal("saveCandidate"), id: mongoId.optional(), row: candidateRow }),
    z.object({ action: z.literal("deleteCandidate"), id: mongoId }),
    z.object({ action: z.literal("reopenCandidate"), id: mongoId }),
    z.object({ action: z.literal("importChecklist"), mode: importMode, rows: z.array(checklistRow).min(1).max(2000) }),
    z.object({ action: z.literal("saveChecklistItem"), id: mongoId.optional(), row: checklistRow }),
    z.object({ action: z.literal("deleteChecklistItem"), id: mongoId }),
    z.object({ action: z.literal("importQuestions"), mode: importMode, rows: z.array(questionRow).min(1).max(2000) }),
    z.object({ action: z.literal("saveQuestion"), id: mongoId.optional(), row: questionRow }),
    z.object({ action: z.literal("deleteQuestion"), id: mongoId }),
    z.object({
        action: z.literal("saveExaminer"),
        id: mongoId.optional(),
        fullName: z.string().trim().min(1).max(200),
        username: z.string().trim().min(2).max(60).regex(/^[A-Za-z0-9._-]+$/, "Letters, numbers, . _ - only"),
        pin: z.string().trim().min(4).max(30),
        stationNumber: z.number().int().min(1).max(6).nullable(),
        canEdit: z.boolean(),
        components: z.array(componentEnum).max(3),
    }),
    z.object({ action: z.literal("deleteExaminer"), id: mongoId }),
    z.object({ action: z.literal("startExam") }),
    z.object({ action: z.literal("adjustTime"), minutes: z.number().int().min(-600).max(600) }),
    z.object({ action: z.literal("endExam") }),
    z.object({ action: z.literal("resetExam"), clearResponses: z.boolean() }),
    z.object({ action: z.literal("changePassword"), newPassword: z.string().min(6) }),
]);
export const postAdminAction = (token, body, init) => apiFetch("admin/action", { method: "POST", body: schema.parse(body), token, init });
