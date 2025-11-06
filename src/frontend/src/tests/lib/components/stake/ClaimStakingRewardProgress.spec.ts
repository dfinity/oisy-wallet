import ClaimStakingRewardProgress from '$lib/components/stake/ClaimStakingRewardProgress.svelte';
import { ProgressStepsClaimStakingReward } from '$lib/enums/progress-steps';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('ClaimStakingRewardProgress', () => {
	const props = {
		claimStakingRewardProgressStep: ProgressStepsClaimStakingReward.CLAIM
	};

	it('renders data correctly', () => {
		const { container } = render(ClaimStakingRewardProgress, {
			props
		});

		expect(container).toHaveTextContent(en.stake.text.claiming);
	});
});
