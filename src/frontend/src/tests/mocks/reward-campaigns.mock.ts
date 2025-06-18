import {
	SPRINKLES_SEASON_1_EPISODE_3_ID,
	SPRINKLES_SEASON_1_EPISODE_4_ID
} from '$env/reward-campaigns.env';
import type { RewardCampaignDescription } from '$env/types/env-reward';

export const mockRewardCampaigns: RewardCampaignDescription[] = [
	{
		id: SPRINKLES_SEASON_1_EPISODE_3_ID,
		title: 'OISY Airdrop',
		cardTitle: 'OISY Rewards Season is Now Active!',
		oneLiner: 'The one stop token shop - Trade tokens across all chains with ease using KongSwap.',
		participateTitle: 'Earn BTC by staying active - and now by inviting others.',
		description: 'Some short description for the Airdrop. Some short description for the Airdrop.',
		logo: '/images/rewards/oisy-reward-logo.svg',
		cardBanner: '/images/rewards/oisy-episode-three-campaign.svg',
		campaignHref:
			'https://x.com/intent/post?text=Haven%E2%80%99t%20joined%20%40OISY%20Sprinkles%20yet%3F%0AThey%E2%80%99re%20dropping%20free%20%24BTC%20-%20all%20day%2C%20every%20day.%0AHead%20to%20OISY.com%20and%20try%20it%20for%20yourself.%20%F0%9F%9A%80%0A',
		learnMoreHref: 'https://docs.oisy.com/rewards/get-to-know-oisy/launch-initiative/initiative-1',
		startDate: new Date('2025-02-05T14:28:02.288Z'),
		endDate: new Date('2030-03-04T00:00:00.000Z'),
		win: {
			default: {
				title: 'Congratulations on earning today’s OISY Sprinkles!',
				banner: '/images/rewards/reward-received.svg',
				description: 'Share your victory on Twitter to qualify for another chance to earn.',
				shareHref:
					'https://x.com/intent/post?text=Just%20scored%20free%20Bitcoin%20from%20%40OISY%20Wallet%20%F0%9F%AA%82%0AThey%E2%80%99re%20dropping%20sprinkles%20of%20%24BTC%20non-stop.%0AIf%20you%E2%80%99re%20not%20on%20OISY.com%20yet%2C%20now%E2%80%99s%20the%20time.'
			},
			jackpot: {
				title: 'Congratulations on earning today’s largest OISY Sprinkles!',
				banner: '/images/rewards/reward-jackpot-received.svg',
				description: 'Share your victory on Twitter to qualify for another chance to earn.',
				shareHref:
					'https://x.com/intent/post?text=Just%20hit%20a%20Super%20Sprinkles%20drop%20from%20%40OISY%20Wallet%20%F0%9F%AA%82%0ASmall%20drops%20all%20day%20%2B%205%20big%20%24BTC%20drops%20every%20single%20day.%0ASign%20up%20at%20OISY.com%2C%20and%20get%20free%20Bitcoin.'
			},
			referral: {
				title: 'Here a small thank you',
				banner: '/images/rewards/reward-jackpot-received.svg',
				description: 'One of your referred users just got some sprinkles.',
				shareHref:
					'https://x.com/intent/post?text=Just%20hit%20a%20Super%20Sprinkles%20drop%20from%20%40OISY%20Wallet%20%F0%9F%AA%82%0ASmall%20drops%20all%20day%20%2B%205%20big%20%24BTC%20drops%20every%20single%20day.%0ASign%20up%20at%20OISY.com%2C%20and%20get%20free%20Bitcoin.'
			}
		}
	},
	{
		id: SPRINKLES_SEASON_1_EPISODE_4_ID,
		title: 'OISY Airdrop',
		cardTitle: 'OISY Rewards Season is Now Active!',
		oneLiner: 'The one stop token shop - Trade tokens across all chains with ease using KongSwap.',
		participateTitle: 'Earn BTC by staying active - and now by inviting others.',
		description: 'Some short description for the Airdrop. Some short description for the Airdrop.',
		logo: '/images/rewards/oisy-reward-logo.svg',
		cardBanner: '/images/rewards/oisy-episode-three-campaign.svg',
		campaignHref:
			'https://x.com/intent/post?text=%F0%9F%8E%81%20Airdrop%20season%201%20started%20on%20%40oisy!%0A%0ASign-up%20and%20participate%20in%3A%20https%3A%2F%2Foisy.com',
		learnMoreHref: 'https://docs.oisy.com/rewards/get-to-know-oisy/launch-initiative/initiative-1',
		startDate: new Date('2029-02-05T14:28:02.288Z'),
		endDate: new Date('2029-03-04T00:00:00.000Z'),
		win: {
			default: {
				title: 'Congratulations on earning today’s OISY Sprinkles!',
				banner: '/images/rewards/reward-received.svg',
				description: 'Share your victory on Twitter to qualify for another chance to earn.',
				shareHref:
					'https://x.com/intent/post?text=Just%20received%20an%20%F0%9F%8E%81%20Airdrop%20%F0%9F%8E%81%20in%20%40oisy%27s%20first%20airdrop%20campaign!%0A%0ASign-up%20and%20participate%20in%3A%20https%3A%2F%2Foisy.com'
			},
			jackpot: {
				title: 'Congratulations on earning today’s largest OISY Sprinkles!',
				banner: '/images/rewards/reward-jackpot-received.svg',
				description: 'Share your victory on Twitter to qualify for another chance to earn.',
				shareHref:
					'https://x.com/intent/post?text=Just%20received%20a%20%F0%9F%8E%87%20Jackpot%20Airdrop%20%F0%9F%8E%87%20worth%20%2450%20in%20%40oisy%27s%20first%20airdrop%20campaign%21%0D%0A%0D%0ASign-up%20and%20participate%20in%3A%20https%3A%2F%2Foisy.com'
			},
			leaderboard: {
				title: 'You topped the Leaderboard',
				banner: '/images/rewards/reward-jackpot-received.svg',
				description:
					'You ranked among the top 4 referrers this season $200 has been added to your wallet',
				shareHref:
					'https://x.com/intent/post?text=Just%20placed%20top%204%20on%20%40OISY%20referrals%20and%20won%20%24200.%0AIt%E2%80%99s%20one%20of%20the%20best%20reward%20systems%20in%20the%20game.%0ACheck%20OISY.com%20today'
			},
			referrer: {
				title: 'You and 4 friends you referred got a bonus sprinkle',
				banner: '/images/rewards/airdrop-icp.svg',
				description: 'Keep on referring friends to add more bonus sprinkles.',
				shareHref:
					'https://x.com/intent/post?text=Got%20Sprinkles%20from%20referring%20with%20%40OISY.%0AEveryone%20wins%20this%20season%2C%20referrer%20and%20referee.%0AIt%E2%80%99s%20live%20at%20OISY.com'
			},
			referee: {
				title: 'Get more for Referring',
				banner: '/images/rewards/airdrop-icp.svg',
				description:
					'You just earned Sprinkles - so did the person who referred you.Send 4 friends and earn $1.Top 4 referrers win $200 each.',
				shareHref:
					'https://x.com/intent/post?text=I%20signed%20up%20for%20%40OISY%20and%20got%20Sprinkles.%0ASo%20did%20the%20friend%20who%20referred%20me.%20Win-win.%0ACheck%20OISY.com'
			}
		}
	},
	{
		id: 'sprinkles_s1e5',
		title: 'OISY Airdrop',
		cardTitle: 'OISY Rewards Season is Now Active!',
		oneLiner: 'The one stop token shop - Trade tokens across all chains with ease using KongSwap.',
		participateTitle: 'Earn BTC by staying active - and now by inviting others.',
		description: 'Some short description for the Airdrop. Some short description for the Airdrop.',
		logo: '/images/rewards/oisy-reward-logo.svg',
		cardBanner: '/images/rewards/oisy-episode-three-campaign.svg',
		campaignHref:
			'https://x.com/intent/post?text=%F0%9F%8E%81%20Airdrop%20season%201%20started%20on%20%40oisy!%0A%0ASign-up%20and%20participate%20in%3A%20https%3A%2F%2Foisy.com',
		learnMoreHref: 'https://docs.oisy.com/rewards/get-to-know-oisy/launch-initiative/initiative-1',
		startDate: new Date('2025-02-05T14:28:02.288Z'),
		endDate: new Date('2025-03-04T00:00:00.000Z'),
		win: {
			default: {
				title: 'Congratulations on earning today’s OISY Sprinkles!',
				banner: '/images/rewards/reward-received.svg',
				description: 'Share your victory on Twitter to qualify for another chance to earn.',
				shareHref:
					'https://x.com/intent/post?text=Just%20received%20an%20%F0%9F%8E%81%20Airdrop%20%F0%9F%8E%81%20in%20%40oisy%27s%20first%20airdrop%20campaign!%0A%0ASign-up%20and%20participate%20in%3A%20https%3A%2F%2Foisy.com'
			},
			jackpot: {
				title: 'Congratulations on earning today’s largest OISY Sprinkles!',
				banner: '/images/rewards/reward-jackpot-received.svg',
				description: 'Share your victory on Twitter to qualify for another chance to earn.',
				shareHref:
					'https://x.com/intent/post?text=Just%20received%20a%20%F0%9F%8E%87%20Jackpot%20Airdrop%20%F0%9F%8E%87%20worth%20%2450%20in%20%40oisy%27s%20first%20airdrop%20campaign%21%0D%0A%0D%0ASign-up%20and%20participate%20in%3A%20https%3A%2F%2Foisy.com'
			}
		}
	}
];
