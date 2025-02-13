import * as z from "zod";
import type {AirdropEventsSchema} from "$env/schema/env-airdrop.schema";

export type AirdropDescription = z.infer<typeof AirdropEventsSchema>;