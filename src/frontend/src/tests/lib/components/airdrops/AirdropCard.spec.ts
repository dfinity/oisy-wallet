import type { AirdropDescription } from '$env/types/env-airdrop';
import AirdropCard from '$lib/components/airdrops/AirdropCard.svelte';
import { mockAirdropCampaigns } from '$tests/mocks/airdrop-campaigns.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('AirdropCard', () => {
	it('should render airdrop card content', () => {
		const mockedAirdrop: AirdropDescription | undefined = mockAirdropCampaigns.find(
			(campaign) => campaign.id === 'OISY Airdrop #1'
		);
		assertNonNullish(mockedAirdrop);

		const testId = 'testId';
		const logoSelector = `div[data-tid="${testId}-logo"]`;
		const badgeSelector = `span[data-tid="${testId}-badge"]`;

		const { container, getByText } = render(AirdropCard, {
			props: {
				airdrop: mockedAirdrop,
				testId: testId
			}
		});

		expect(getByText(mockedAirdrop.cardTitle)).toBeInTheDocument();
		expect(getByText(mockedAirdrop.oneLiner)).toBeInTheDocument();

		const logo: HTMLDivElement | null = container.querySelector(logoSelector);
		expect(logo).toBeInTheDocument();

		const badge: HTMLSpanElement | null = container.querySelector(badgeSelector);
		expect(badge).toBeInTheDocument();
	});
});
