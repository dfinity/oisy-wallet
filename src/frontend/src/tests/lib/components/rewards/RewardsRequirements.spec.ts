import type { RewardDescription } from '$env/types/env-reward';
import RewardsRequirements from '$lib/components/rewards/RewardsRequirements.svelte';
import { REWARDS_REQUIREMENTS_STATUS } from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('RewardsRequirements', () => {
	const mockRewardCampaign: RewardDescription | undefined = mockRewardCampaigns.find(
		({ id }) => id === 'OISY Airdrop #1'
	);
	assertNonNullish(mockRewardCampaign);

	describe('IsEligible', () => {
		it('should not render badge if not eligible', () => {
			const { queryByText } = render(RewardsRequirements, {
				props: {
					loading: false,
					reward: mockRewardCampaign,
					isEligible: false,
					requirementsFulfilled: [true, true, true]
				}
			});

			expect(queryByText(get(i18n).rewards.text.youre_eligible)).not.toBeInTheDocument();
		});

		it('should render badge if eligible', () => {
			const { queryByText } = render(RewardsRequirements, {
				props: {
					loading: false,
					reward: mockRewardCampaign,
					isEligible: true,
					requirementsFulfilled: [true, true, true]
				}
			});

			expect(queryByText(get(i18n).rewards.text.youre_eligible)).toBeInTheDocument();
		});
	});

	describe('RequirementsFulfilled', () => {
		const requirementStatusSelector = (index: number) =>
			`span[data-tid="${REWARDS_REQUIREMENTS_STATUS}-${index}"]`;

		it('should render all requirements as fulfilled', () => {
			const { container } = render(RewardsRequirements, {
				props: {
					loading: false,
					reward: mockRewardCampaign,
					isEligible: false,
					requirementsFulfilled: [true, true, true]
				}
			});

			mockRewardCampaign.requirements.forEach((requirement, index) => {
				const requirementStatus: HTMLSpanElement | null = container.querySelector(
					requirementStatusSelector(index)
				);
				expect(requirementStatus).toBeInTheDocument();
				expect(requirementStatus?.className).toContain('text-success-primary');
			});
		});

		it('should render all requirements as not fulfilled', () => {
			const { container } = render(RewardsRequirements, {
				props: {
					loading: false,
					reward: mockRewardCampaign,
					isEligible: false,
					requirementsFulfilled: [false, false, false]
				}
			});

			mockRewardCampaign.requirements.forEach((requirement, index) => {
				const requirementStatus: HTMLSpanElement | null = container.querySelector(
					requirementStatusSelector(index)
				);
				expect(requirementStatus).toBeInTheDocument();
				expect(requirementStatus?.className).toContain('text-disabled');
			});
		});

		it('should render all requirements as not fulfilled if incorrect amount of states are provided', () => {
			const { container } = render(RewardsRequirements, {
				props: {
					loading: false,
					reward: mockRewardCampaign,
					isEligible: false,
					requirementsFulfilled: [false, false]
				}
			});

			mockRewardCampaign.requirements.forEach((requirement, index) => {
				const requirementStatus: HTMLSpanElement | null = container.querySelector(
					requirementStatusSelector(index)
				);
				expect(requirementStatus).toBeInTheDocument();
				expect(requirementStatus?.className).toContain('text-disabled');
			});
		});

		it('should render all requirements as not fulfilled if no states are provided', () => {
			const { container } = render(RewardsRequirements, {
				props: {
					loading: false,
					reward: mockRewardCampaign,
					isEligible: false,
					requirementsFulfilled: []
				}
			});

			mockRewardCampaign.requirements.forEach((requirement, index) => {
				const requirementStatus: HTMLSpanElement | null = container.querySelector(
					requirementStatusSelector(index)
				);
				expect(requirementStatus).toBeInTheDocument();
				expect(requirementStatus?.className).toContain('text-disabled');
			});
		});
	});
});
