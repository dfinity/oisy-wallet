import { SPRINKLES_SEASON_1_EPISODE_3_ID } from '$env/reward-campaigns.env';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import RewardsRequirements from '$lib/components/rewards/RewardsRequirements.svelte';
import { REWARDS_REQUIREMENTS_STATUS } from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { mockCampaignEligibilities } from '$tests/mocks/reward-eligibility-report.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('RewardsRequirements', () => {
	const mockRewardCampaign: RewardCampaignDescription | undefined = mockRewardCampaigns.find(
		({ id }) => id === SPRINKLES_SEASON_1_EPISODE_3_ID
	);
	assertNonNullish(mockRewardCampaign);

	const [firstCampaign] = mockCampaignEligibilities;
	assertNonNullish(firstCampaign);

	describe('IsEligible', () => {
		it('should not render badge if not eligible', () => {
			const { queryByText } = render(RewardsRequirements, {
				props: {
					isEligible: false,
					criteria: firstCampaign.criteria
				}
			});

			expect(queryByText(get(i18n).rewards.text.youre_eligible)).not.toBeInTheDocument();
		});

		it('should render badge if eligible', () => {
			const { queryByText } = render(RewardsRequirements, {
				props: {
					isEligible: true,
					criteria: firstCampaign.criteria
				}
			});

			expect(queryByText(get(i18n).rewards.text.youre_eligible)).toBeInTheDocument();
		});
	});

	describe('Requirements', () => {
		const requirementStatusSelector = (index: number) =>
			`span[data-tid="${REWARDS_REQUIREMENTS_STATUS}-${index}"]`;

		it('should render all requirements', () => {
			const { container } = render(RewardsRequirements, {
				props: {
					isEligible: false,
					criteria: firstCampaign.criteria
				}
			});

			firstCampaign.criteria.forEach((requirement, index) => {
				const requirementStatus: HTMLSpanElement | null = container.querySelector(
					requirementStatusSelector(index)
				);

				expect(requirementStatus).toBeInTheDocument();
			});
		});
	});
});
