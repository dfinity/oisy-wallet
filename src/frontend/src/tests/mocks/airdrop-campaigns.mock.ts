import { AirdropEventsSchema, type AirdropDescription } from '$lib/types/airdrop-events';
import mockAirdropCampaignsJson from '$tests/mock-airdrop-campaigns.json';
import * as z from 'zod';

const parseResult = z.array(AirdropEventsSchema).safeParse(mockAirdropCampaignsJson);
export const mockAirdropCampaigns: AirdropDescription[] = parseResult.success
    ? parseResult.data
    : [];