import { AirdropEventsSchema, type AirdropDescription } from '$lib/types/airdrop-events';
import mockAirdropEventsJson from '$tests/mock-airdrop-events.json';
import * as z from 'zod';

const parseResult = z.array(AirdropEventsSchema).safeParse(mockAirdropEventsJson);
export const mockAirdropEvents: AirdropDescription[] = parseResult.success ? parseResult.data : [];