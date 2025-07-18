import { SPRINKLES_SEASON_1_EPISODE_3_ID } from '$env/reward-campaigns.env';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import oisyEpisodeFour from '$lib/assets/oisy-episode-four-coming.svg';
import RewardsGroup from '$lib/components/rewards/RewardsGroup.svelte';
import {
	initRewardEligibilityContext,
	initRewardEligibilityStore,
	REWARD_ELIGIBILITY_CONTEXT_KEY
} from '$lib/stores/reward.store';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { mockCampaignEligibilities } from '$tests/mocks/reward-eligibility-report.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('RewardsGroups', () => {
	const mockRewardCampaign: RewardCampaignDescription | undefined = mockRewardCampaigns.find(
		({ id }) => id === SPRINKLES_SEASON_1_EPISODE_3_ID
	);
	assertNonNullish(mockRewardCampaign);

	const title = 'Active campaigns';
	const groupTitle = 'campaign';
	const activeGroupSelector = `button[data-tid="${groupTitle}-${mockRewardCampaign.id}"]`;
	const altImageSelector = `img[data-tid="${groupTitle}-alt-img"]`;

	const mockContext = new Map([]);
	const store = initRewardEligibilityStore();
	mockContext.set(REWARD_ELIGIBILITY_CONTEXT_KEY, initRewardEligibilityContext(store));
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

	it('should render alternative image', () => {
		const { container, getByText } = render(RewardsGroup, {
			props: {
				title,
				rewards: [],
				testId: groupTitle,
				altImg: oisyEpisodeFour
			},
			context: mockContext
		});

		expect(getByText(title)).toBeInTheDocument();

		const altImage: HTMLImageElement | null = container.querySelector(altImageSelector);

		expect(altImage).toBeInTheDocument();
	});

	it('should render campaigns even if alternative text is defined', () => {
		const altText = 'Stay tuned';

		const { container, queryByText } = render(RewardsGroup, {
			props: {
				title,
				rewards: mockRewardCampaigns,
				testId: groupTitle,
				altText,
				altImg: oisyEpisodeFour
			},
			context: mockContext
		});

		expect(queryByText(title)).toBeInTheDocument();
		expect(queryByText(altText)).not.toBeInTheDocument();

		const activeGroup: HTMLButtonElement | null = container.querySelector(activeGroupSelector);

		expect(activeGroup).toBeInTheDocument();

		const altImage: HTMLImageElement | null = container.querySelector(altImageSelector);

		expect(altImage).not.toBeInTheDocument();
	});
});
