import RewardRequirement from '$lib/components/rewards/RewardRequirement.svelte';
import { REWARDS_REQUIREMENTS_STATUS } from '$lib/constants/test-ids.constants';
import { RewardCriterionType } from '$lib/enums/reward-criterion-type';
import { i18n } from '$lib/stores/i18n.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('RewardRequirement', () => {
	describe('Requirements', () => {
		it('should not render min logins requirement', () => {
			const { getByText } = render(RewardRequirement, {
				props: {
					criterion: {
						satisfied: true,
						type: RewardCriterionType.MIN_LOGINS,
						days: 6n,
						count: 2
					}
				}
			});

			expect(
				getByText(
					replacePlaceholders(get(i18n).rewards.requirements.min_logins, {
						$logins: '2',
						$days: '6'
					})
				)
			).toBeInTheDocument();
		});

		it('should not render min transactions requirement', () => {
			const { getByText } = render(RewardRequirement, {
				props: {
					criterion: {
						satisfied: false,
						type: RewardCriterionType.MIN_TRANSACTIONS,
						days: 6n,
						count: 3
					}
				}
			});

			expect(
				getByText(
					replacePlaceholders(get(i18n).rewards.requirements.min_transactions, {
						$transactions: '3',
						$days: '6'
					})
				)
			).toBeInTheDocument();
		});

		it('should not render min total assets usd requirement', () => {
			const { getByText } = render(RewardRequirement, {
				props: {
					criterion: {
						satisfied: false,
						type: RewardCriterionType.MIN_TOTAL_ASSETS_USD,
						usd: 21
					}
				}
			});

			expect(
				getByText(
					replacePlaceholders(get(i18n).rewards.requirements.min_total_assets_usd, {
						$usd: '21'
					})
				)
			).toBeInTheDocument();
		});
	});

	describe('States', () => {
		const requirementStatusSelector = `span[data-tid="${REWARDS_REQUIREMENTS_STATUS}"]`;

		it('should not render satisfied requirement', () => {
			const { container } = render(RewardRequirement, {
				props: {
					criterion: {
						satisfied: true,
						type: RewardCriterionType.MIN_LOGINS,
						days: 6n,
						count: 2
					},
					testId: REWARDS_REQUIREMENTS_STATUS
				}
			});

			const requirementStatus: HTMLSpanElement | null =
				container.querySelector(requirementStatusSelector);

			expect(requirementStatus).toBeInTheDocument();
			expect(requirementStatus?.className).toContain('text-success-primary');
		});

		it('should not render not satisfied requirement', () => {
			const { container } = render(RewardRequirement, {
				props: {
					criterion: {
						satisfied: false,
						type: RewardCriterionType.MIN_LOGINS,
						days: 6n,
						count: 2
					},
					testId: REWARDS_REQUIREMENTS_STATUS
				}
			});

			const requirementStatus: HTMLSpanElement | null =
				container.querySelector(requirementStatusSelector);

			expect(requirementStatus).toBeInTheDocument();
			expect(requirementStatus?.className).not.toContain('text-success-primary');
		});
	});
});
