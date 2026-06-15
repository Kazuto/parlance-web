import { z } from "zod";

export const PermissionSchema = z.object({
  id: z.string(),
  name: z.string(),
  resource: z.string(),
  action: z.string(),
});

export type Permission = z.infer<typeof PermissionSchema>;
