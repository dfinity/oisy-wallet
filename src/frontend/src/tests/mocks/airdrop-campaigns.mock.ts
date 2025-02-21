import type { AirdropDescription } from '$env/types/env-airdrop';

export const mockAirdropCampaigns: AirdropDescription[] = [
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
		logo: '/images/airdrops/oisy-airdrop-logo.svg',
		campaignHref:
			'https://x.com/intent/post?text=Rewards%20from%20%40OISY%20Wallet%20just%20dropped%0A%0A50%20token%20reward%20opportunities%2C%20EVERY%20Day%0A%0ATry%20OISY.com%20and%20stack%20some%20rewards%20fam%20%F0%9F%9A%80',
		jackpotHref:
			'https://x.com/intent/post?text=Just%20received%20%2450%20in%20tokens%20from%20%40OISY%20Wallet%E2%80%99s%20rewards%20initiative%20%F0%9F%8C%9F%0A%0AAnd%20I%E2%80%99m%20eligible%20again%20tomorrow...and%20the%20day%20after%20that...and%20the%20day%20after%20that...and%2C%20you%20get%20the%20idea%0A%0ASign%20up%20at%20OISY.com%E2%80%9450%20rewards%20a%20day%2C%20every%20day%20%F0%9F%A4%91',
		airdropHref:
			'https://x.com/intent/post?text=Just%20got%20my%20rewards%20from%20%40OISY%20Wallet.%0A%0AI%E2%80%99m%20eligible%20for%2050%20rewards%20every%20day%2C%20and%20I%E2%80%99m%20ready%20for%20more%21%20%F0%9F%AA%82%0A%0AIf%20you%E2%80%99re%20not%20on%20OISY.com%2C%20you%E2%80%99re%20NGMI',
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
		logo: '/images/airdrops/oisy-airdrop-logo.svg',
		campaignHref:
			'https://x.com/intent/post?text=%F0%9F%8E%81%20Airdrop%20season%201%20started%20on%20%40oisy!%0A%0ASign-up%20and%20participate%20in%3A%20https%3A%2F%2Foisy.com',
		jackpotHref:
			'https://x.com/intent/post?text=Just%20received%20a%20%F0%9F%8E%87%20Jackpot%20Airdrop%20%F0%9F%8E%87%20worth%20%2450%20in%20%40oisy%27s%20first%20airdrop%20campaign%21%0D%0A%0D%0ASign-up%20and%20participate%20in%3A%20https%3A%2F%2Foisy.com',
		airdropHref:
			'https://x.com/intent/post?text=Just%20received%20an%20%F0%9F%8E%81%20Airdrop%20%F0%9F%8E%81%20in%20%40oisy%27s%20first%20airdrop%20campaign!%0A%0ASign-up%20and%20participate%20in%3A%20https%3A%2F%2Foisy.com',
		startDate: new Date('2029-02-05T14:28:02.288Z'),
		endDate: new Date('2029-03-04T00:00:00.000Z')
	}
];
