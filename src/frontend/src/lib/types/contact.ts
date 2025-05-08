import type { ContactSchema } from "$env/schema/env-contact.schema";
import type { z } from "zod";

export type Contact = z.infer<typeof ContactSchema>;
