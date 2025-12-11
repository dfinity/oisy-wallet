import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import StakeReview from '$lib/components/stake/StakeReview.svelte';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { render } from '@testing-library/svelte';

describe('StakeReview', () => {
	const mockContext = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })]]);

	const props = {
		amount: 0.01,
		disabled: false,
		onConfirm: () => {},
		onBack: () => {},
		actionButtonLabel: 'Stake'
	};

	it('should keep the next button clickable if all requirements are met', () => {
		const { getByTestId } = render(StakeReview, {
			props,
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).not.toHaveAttribute('disabled');
	});

	it('should disable the next button clickable if amount is incorrect', () => {
		const { getByTestId } = render(StakeReview, {
			props: {
				...props,
				disabled: true
			},
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled');
	});
});
