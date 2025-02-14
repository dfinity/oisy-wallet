import type { AirdropDescription } from '$env/types/env-airdrop';

export const mockAirdropCampaigns: AirdropDescription[] = [
	{
		id: 'OISY Airdrop #1',
		title: 'OISY Airdrop',
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
		startDate: new Date('2025-02-05T14:28:02.288Z'),
		endDate: new Date('2025-03-04T00:00:00.000Z')
	},
	{
		id: 'OISY Airdrop #2',
		title: 'OISY Airdrop',
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
