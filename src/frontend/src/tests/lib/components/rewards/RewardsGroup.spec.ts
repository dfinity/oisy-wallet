import type { RewardDescription } from '$env/types/env-reward';
import RewardsGroup from '$lib/components/rewards/RewardsGroup.svelte';
import {
	initRewardEligibilityStore,
	REWARD_ELIGIBILITY_CONTEXT_KEY
} from '$lib/stores/reward.store';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { mockCampaignEligibilities } from '$tests/mocks/reward-eligibility-report.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('RewardsGroups', () => {
	const mockRewardCampaign: RewardDescription | undefined = mockRewardCampaigns.find(
		({ id }) => id === 'OISY Airdrop #1'
	);
	assertNonNullish(mockRewardCampaign);

	const title = 'Active campaigns';
	const groupTitle = 'campaign';
	const activeGroupSelector = `button[data-tid="${groupTitle}-${mockRewardCampaign.id}"]`;

	const mockContext = new Map([]);
	const store = initRewardEligibilityStore();
	mockContext.set(REWARD_ELIGIBILITY_CONTEXT_KEY, { store });
	store.setCampaignEligibilities(mockCampaignEligibilities);

	it('should render campaigns', () => {
		const { container, getByText } = render(RewardsGroup, {
			props: {
				title,
				rewards: mockRewardCampaigns,
				testId: groupTitle
			},
			context: mockContext
		});

		expect(getByText(title)).toBeInTheDocument();

		const activeGroup: HTMLButtonElement | null = container.querySelector(activeGroupSelector);

		expect(activeGroup).toBeInTheDocument();
	});

	it('should render alternative text', () => {
		const altText = 'Stay tuned';

		const { container, getByText } = render(RewardsGroup, {
			props: {
				title,
				rewards: [],
				testId: groupTitle,
				altText
			},
			context: mockContext
		});

		expect(getByText(title)).toBeInTheDocument();
		expect(getByText(altText)).toBeInTheDocument();

		const activeGroup: HTMLButtonElement | null = container.querySelector(activeGroupSelector);

		expect(activeGroup).not.toBeInTheDocument();
	});

	it('should render campaigns even if alternative text is defined', () => {
		const altText = 'Stay tuned';

		const { container, queryByText } = render(RewardsGroup, {
			props: {
				title,
				rewards: mockRewardCampaigns,
				testId: groupTitle,
				altText
			},
			context: mockContext
		});

		expect(queryByText(title)).toBeInTheDocument();
		expect(queryByText(altText)).not.toBeInTheDocument();

		const activeGroup: HTMLButtonElement | null = container.querySelector(activeGroupSelector);

		expect(activeGroup).toBeInTheDocument();
	});
});
