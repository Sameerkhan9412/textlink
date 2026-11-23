import { z } from "zod";
import { CODE_MAX, CODE_MIN, TEXT_MAX, getCodeProblem, normalizeCode, CODE_PROBLEM_MESSAGES } from "./code";

export const codeSchema = z
  .string()
  .max(CODE_MAX * 2, "Code is too long.")
  .transform(normalizeCode)
  .superRefine((value, ctx) => {
    const problem = getCodeProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: CODE_PROBLEM_MESSAGES[problem] });
  });

export const createTextSchema = z.object({
  content: z
    .string()
    .refine((v) => v.trim().length > 0, "Text can't be empty.")
    .refine((v) => v.length <= TEXT_MAX, `Text can be at most ${TEXT_MAX.toLocaleString("en-US")} characters.`),
  code: codeSchema,
});

export type CreateTextInput = z.infer<typeof createTextSchema>;
export { CODE_MIN, CODE_MAX, TEXT_MAX };
