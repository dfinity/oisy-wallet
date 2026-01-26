import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtUnstakeForm from '$icp/components/stake/gldt/GldtUnstakeForm.svelte';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import {
	STAKE_FORM_REVIEW_BUTTON,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { stakePositionMockResponse } from '$tests/mocks/gldt_stake.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('GldtUnstakeForm', () => {
	const mockContext = () => {
		const store = initGldtStakeStore();
		store.setPosition(stakePositionMockResponse);

		return new Map<symbol, SendContext | GldtStakeContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })],
			[GLDT_STAKE_CONTEXT_KEY, { store }]
		]);
	};

	const props = {
		amount: 1,
		dissolveInstantly: true,
		onClose: () => {},
		onNext: () => {}
	};

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should keep the next button clickable if all requirements are met', () => {
		const { getByTestId } = render(GldtUnstakeForm, {
			props,
			context: mockContext()
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).not.toHaveAttribute('disabled');
	});

	it('should disable the next button clickable if amount is incorrect', () => {
		const { getByTestId } = render(GldtUnstakeForm, {
			props: {
				...props,
				amount: undefined
			},
			context: mockContext()
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});

	it('should disable the next button clickable if balance is lower than provided amount', async () => {
		const { getByTestId } = render(GldtUnstakeForm, {
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
