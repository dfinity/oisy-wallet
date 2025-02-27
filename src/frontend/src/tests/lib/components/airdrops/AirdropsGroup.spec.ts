import type { AirdropDescription } from '$env/types/env-airdrop';
import AirdropsGroup from '$lib/components/airdrops/AirdropsGroup.svelte';
import { mockAirdropCampaigns } from '$tests/mocks/airdrop-campaigns.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('AirdropsGroups', () => {
	const mockAirdropCampaign: AirdropDescription | undefined = mockAirdropCampaigns.find(
		({ id }) => id === 'OISY Airdrop #1'
	);
	assertNonNullish(mockAirdropCampaign);

	const title = 'Active campaigns';
	const groupTitle = 'campaign';
	const activeGroupSelector = `button[data-tid="${groupTitle}-${mockAirdropCampaign.id}"]`;

	it('should render campaigns', () => {
		const { container, getByText } = render(AirdropsGroup, {
			props: {
				title,
				airdrops: mockAirdropCampaigns,
				testId: groupTitle
			}
		});

		expect(getByText(title)).toBeInTheDocument();

		const activeGroup: HTMLButtonElement | null = container.querySelector(activeGroupSelector);
		expect(activeGroup).toBeInTheDocument();
	});

	it('should render alternative text', () => {
		const altText = 'Stay tuned';

		const { container, getByText } = render(AirdropsGroup, {
			props: {
				title,
				airdrops: [],
				testId: groupTitle,
				altText: altText
			}
		});

		expect(getByText(title)).toBeInTheDocument();
		expect(getByText(altText)).toBeInTheDocument();

		const activeGroup: HTMLButtonElement | null = container.querySelector(activeGroupSelector);
		expect(activeGroup).not.toBeInTheDocument();
	});

	it('should render campaigns even if alternative text is defined', () => {
		const altText = 'Stay tuned';

		const { container, queryByText } = render(AirdropsGroup, {
			props: {
				title,
				airdrops: mockAirdropCampaigns,
				testId: groupTitle,
				altText: altText
			}
		});

		expect(queryByText(title)).toBeInTheDocument();
		expect(queryByText(altText)).not.toBeInTheDocument();

		const activeGroup: HTMLButtonElement | null = container.querySelector(activeGroupSelector);
		expect(activeGroup).toBeInTheDocument();
	});
});
