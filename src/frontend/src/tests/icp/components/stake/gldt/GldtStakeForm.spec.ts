import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtStakeForm from '$icp/components/stake/gldt/GldtStakeForm.svelte';
import {
	STAKE_FORM_REVIEW_BUTTON,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('GldtStakeForm', () => {
	const mockContext = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })]]);

	const props = {
		amount: 0.01,
		onClose: () => {},
		onNext: () => {}
	};

	it('should keep the next button clickable if all requirements are met', () => {
		const { getByTestId } = render(GldtStakeForm, {
			props,
			context: mockContext()
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).not.toHaveAttribute('disabled');
	});

	it('should disable the next button clickable if amount is incorrect', () => {
		const { getByTestId } = render(GldtStakeForm, {
			props: {
				...props,
				amount: undefined
			},
			context: mockContext()
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});

	it('should disable the next button clickable if balance is lower than provided amount', async () => {
		const { getByTestId } = render(GldtStakeForm, {
			props,
			context: mockContext()
		});

		const input = getByTestId(TOKEN_INPUT_CURRENCY_TOKEN);

		await fireEvent.input(input, { target: { value: '9999999' } });

		await waitFor(() => {
			expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
		});
	});
});
