import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtClaimStakingRewardReview from '$icp/components/stake/gldt/GldtClaimStakingRewardReview.svelte';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { render } from '@testing-library/svelte';

describe('GldtClaimStakingRewardReview', () => {
	const mockContext = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })]]);

	const props = {
		rewardAmount: 0.01,
		onClose: () => {},
		onClaimReward: () => {}
	};

	it('should keep the next button clickable', () => {
		const { getByTestId } = render(GldtClaimStakingRewardReview, {
			props,
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).not.toHaveAttribute('disabled');
	});

	it('should display correct network name', () => {
		const { getByText } = render(GldtClaimStakingRewardReview, {
			props,
			context: mockContext()
		});

		expect(getByText(ICP_TOKEN.network.name)).toBeInTheDocument();
	});
});
