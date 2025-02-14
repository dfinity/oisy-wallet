import airdropCampaignsJson from '$env/airdrop-campaigns.json';
import { AirdropEventsSchema } from '$env/schema/env-airdrop.schema';
import type { AirdropDescription } from '$env/types/env-airdrop';
import * as z from 'zod';

const parseResult = z.array(AirdropEventsSchema).safeParse(airdropCampaignsJson);
export const airdropCampaigns: AirdropDescription[] = parseResult.success ? parseResult.data : [];
