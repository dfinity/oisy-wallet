import * as z from 'zod';
import airdropEventsJson from '$env/airdrop-events.json';

const AirdropEventsSchema = z.object({
	title: z.string(),
	oneLiner: z.string(),
	description: z.string(),
	requirements: z.array(z.string()),
	logo: z.string(),
	startDate: z.string().transform((val) => new Date(val)),
	endDate: z.string().transform((val) => new Date(val)),
});

export type AirdropDescription = z.infer<typeof AirdropEventsSchema>;

const parseResult = z.array(AirdropEventsSchema).safeParse(airdropEventsJson);
export const airdropEvents: AirdropDescription[] = parseResult.success ? parseResult.data : [];