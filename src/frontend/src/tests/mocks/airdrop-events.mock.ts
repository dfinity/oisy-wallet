import { type AirdropDescription, AirdropEventsSchema } from '$lib/types/airdrop-events';
import * as z from 'zod';
import mockAirdropEventsJson from '$tests/mock-airdrop-events.json';

const parseResult = z.array(AirdropEventsSchema).safeParse(mockAirdropEventsJson);
export const mockAirdropEvents: AirdropDescription[] = parseResult.success ? parseResult.data : [];