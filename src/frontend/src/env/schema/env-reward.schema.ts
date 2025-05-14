import * as z from 'zod';

export const RewardEventsSchema = z.object({
	id: z.string(),
	title: z.string(),
	cardTitle: z.string(),
	oneLiner: z.string(),
	description: z.string(),
	logo: z.string(),
	cardBanner: z.string(),
	campaignHref: z.string(),
	jackpotHref: z.string(),
	airdropHref: z.string(),
	learnMoreHref: z.string(),
	startDate: z.string().transform((val) => new Date(val)),
	endDate: z.string().transform((val) => new Date(val))
});
