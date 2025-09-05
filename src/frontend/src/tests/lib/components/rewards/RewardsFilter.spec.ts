import { REWARDS_FILTER } from '$lib/constants/test-ids.constants';
import { RewardStates } from '$lib/enums/reward-states';
import RewardsFilterTest from '$tests/lib/components/rewards/RewardsFilter.test.svelte';
import { render, waitFor } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';

describe('RewardsFilter', () => {
	const rewardsFilterOngoingButtonSelector = `button[data-tid="${REWARDS_FILTER}-${RewardStates.ONGOING}-button"]`;
	const rewardsFilterEndedButtonSelector = `button[data-tid="${REWARDS_FILTER}-${RewardStates.ENDED}-button"]`;

	it('should render rewards filter', async () => {
		const boundValue = writable(RewardStates.ONGOING);
		const { container } = render(RewardsFilterTest, {
			props: {
				rewardState: boundValue
			}
		});

		const rewardsFilterOngoingButton: HTMLButtonElement | null = container.querySelector(
			rewardsFilterOngoingButtonSelector
		);

		expect(rewardsFilterOngoingButton).toBeInTheDocument();

		const rewardsFilterEndedButton: HTMLButtonElement | null = container.querySelector(
			rewardsFilterEndedButtonSelector
		);

		expect(rewardsFilterEndedButton).toBeInTheDocument();

		await waitFor(() => rewardsFilterEndedButton?.click());

		expect(get(boundValue)).toBe(RewardStates.ENDED);

		await waitFor(() => rewardsFilterOngoingButton?.click());

		expect(get(boundValue)).toBe(RewardStates.ONGOING);
	});
});
