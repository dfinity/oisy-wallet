import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import StakeForm from '$lib/components/stake/StakeForm.svelte';
import { STAKE_FORM_REVIEW_BUTTON } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { render } from '@testing-library/svelte';

describe('StakeForm', () => {
	const mockContext = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })]]);

	const props = {
		amount: 0.01,
		onClose: () => {},
		onNext: () => {}
	};

	it('should keep the next button clickable if all requirements are met', () => {
		const { getByTestId } = render(StakeForm, {
			props,
			context: mockContext()
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).not.toHaveAttribute('disabled');
	});

	it('should disable the next button clickable if amount is incorrect', () => {
		const { getByTestId } = render(StakeForm, {
			props: {
				...props,
				amount: undefined
			},
			context: mockContext()
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});
});
