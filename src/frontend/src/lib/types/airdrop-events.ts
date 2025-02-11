import airdropEventsJson from '$env/airdrop-events.json';
import * as z from 'zod';

export const AirdropEventsSchema = z.object({
	id: z.string(),
	title: z.string(),
	oneLiner: z.string(),
	description: z.string(),
	requirements: z.array(z.string()),
	logo: z.string(),
	shareHref: z.string(),
	startDate: z.string().transform((val) => new Date(val)),
	endDate: z.string().transform((val) => new Date(val))
});

export type AirdropDescription = z.infer<typeof AirdropEventsSchema>;

const parseResult = z.array(AirdropEventsSchema).safeParse(airdropEventsJson);
export const airdropEvents: AirdropDescription[] = parseResult.success ? parseResult.data : [];
