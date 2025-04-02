import type { RewardDescription } from '$env/types/env-reward';

export const mockRewardCampaigns: RewardDescription[] = [
	{
		id: 'OISY Airdrop #1',
		title: 'OISY Airdrop',
		cardTitle: 'OISY Rewards Season is Now Active!',
		oneLiner: 'The one stop token shop - Trade tokens across all chains with ease using KongSwap.',
		description: 'Some short description for the Airdrop. Some short description for the Airdrop.',
		requirements: [
			'Login 1x in last 7 days',
			'Complete 2 transactions in last 7 days',
			'Hold $20 USD at the time of issuance'
		],
		logo: '/images/rewards/oisy-reward-logo.svg',
		campaignHref:
			'https://x.com/intent/post?text=Haven%E2%80%99t%20joined%20%40OISY%20Sprinkles%20yet%3F%0AThey%E2%80%99re%20dropping%20free%20%24BTC%20-%20all%20day%2C%20every%20day.%0AHead%20to%20OISY.com%20and%20try%20it%20for%20yourself.%20%F0%9F%9A%80%0A',
		jackpotHref:
			'https://x.com/intent/post?text=Just%20hit%20a%20Super%20Sprinkles%20drop%20from%20%40OISY%20Wallet%20%F0%9F%AA%82%0ASmall%20drops%20all%20day%20%2B%205%20big%20%24BTC%20drops%20every%20single%20day.%0ASign%20up%20at%20OISY.com%2C%20and%20get%20free%20Bitcoin.',
		airdropHref:
			'https://x.com/intent/post?text=Just%20scored%20free%20Bitcoin%20from%20%40OISY%20Wallet%20%F0%9F%AA%82%0AThey%E2%80%99re%20dropping%20sprinkles%20of%20%24BTC%20non-stop.%0AIf%20you%E2%80%99re%20not%20on%20OISY.com%20yet%2C%20now%E2%80%99s%20the%20time.',
		learnMoreHref: 'https://docs.oisy.com/rewards/get-to-know-oisy/launch-initiative/initiative-1',
		startDate: new Date('2025-02-05T14:28:02.288Z'),
		endDate: new Date('2025-03-04T00:00:00.000Z')
	},
	{
		id: 'OISY Airdrop #2',
		title: 'OISY Airdrop',
		cardTitle: 'OISY Rewards Season is Now Active!',
		oneLiner: 'The one stop token shop - Trade tokens across all chains with ease using KongSwap.',
		description: 'Some short description for the Airdrop. Some short description for the Airdrop.',
		requirements: [
			'Login 1x in last 7 days',
			'Complete 2 transactions in last 7 days',
			'Hold $20 USD at the time of issuance'
		],
		logo: '/images/rewards/oisy-reward-logo.svg',
		campaignHref:
			'https://x.com/intent/post?text=%F0%9F%8E%81%20Airdrop%20season%201%20started%20on%20%40oisy!%0A%0ASign-up%20and%20participate%20in%3A%20https%3A%2F%2Foisy.com',
		jackpotHref:
			'https://x.com/intent/post?text=Just%20received%20a%20%F0%9F%8E%87%20Jackpot%20Airdrop%20%F0%9F%8E%87%20worth%20%2450%20in%20%40oisy%27s%20first%20airdrop%20campaign%21%0D%0A%0D%0ASign-up%20and%20participate%20in%3A%20https%3A%2F%2Foisy.com',
		airdropHref:
			'https://x.com/intent/post?text=Just%20received%20an%20%F0%9F%8E%81%20Airdrop%20%F0%9F%8E%81%20in%20%40oisy%27s%20first%20airdrop%20campaign!%0A%0ASign-up%20and%20participate%20in%3A%20https%3A%2F%2Foisy.com',
		learnMoreHref: 'https://docs.oisy.com/rewards/get-to-know-oisy/launch-initiative/initiative-1',
		startDate: new Date('2029-02-05T14:28:02.288Z'),
		endDate: new Date('2029-03-04T00:00:00.000Z')
	}
];
