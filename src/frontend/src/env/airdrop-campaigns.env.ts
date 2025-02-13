import * as z from "zod";
import airdropCampaignsJson from "$env/airdrop-campaigns.json";
import type {AirdropDescription} from "$env/types/env-airdrop";
import {AirdropEventsSchema} from "$env/schema/env-airdrop.schema";

const parseResult = z.array(AirdropEventsSchema).safeParse(airdropCampaignsJson);
export const airdropCampaigns: AirdropDescription[] = parseResult.success ? parseResult.data : [];