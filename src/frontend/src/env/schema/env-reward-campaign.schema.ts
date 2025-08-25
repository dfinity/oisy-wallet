import * as z from 'zod';

export const RewardCampaignSchema = z.object({
	id: z.string(),
	title: z.string(),
	cardTitle: z.string(),
	oneLiner: z.string(),
	participateTitle: z.string(),
	description: z.string(),
	logo: z.string(),
	cardBanner: z.string(),
	campaignHref: z.string(),
	learnMoreHref: z.string(),
	startDate: z.string().transform((val) => new Date(val)),
	endDate: z.string().transform((val) => new Date(val)),
	win: z.object({
		default: z.object({
			title: z.string(),
			banner: z.string(),
			description: z.string(),
			shareHref: z.string()
		}),
		jackpot: z.object({
			title: z.string(),
			banner: z.string(),
			description: z.string(),
			shareHref: z.string()
		}),
		leaderboard: z
			.object({
				title: z.string(),
				banner: z.string(),
				description: z.string(),
				shareHref: z.string()
			})
			.optional()
	})
});
