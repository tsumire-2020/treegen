import { z } from "zod";

export const treeNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string().min(1),
    type: z.enum(["file", "directory"]),
    depth: z.number().int().min(0),
    children: z.array(treeNodeSchema)
  })
);

export const createOptionsSchema = z.object({
  outputRoot: z.string().min(1),
  dryRun: z.boolean(),
  overwriteMode: z.enum(["error", "skip", "force"]),
  templateDir: z.string().min(1).optional()
});
