import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcSendAmount from '$icp/components/send/IcSendAmount.svelte';
import { TOKEN_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('IcSendAmount', () => {
	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			token: ICP_TOKEN
		})
	);

	const props = {
		amount: 1,
		amountError: undefined
	};
	const newAmount = 10;

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;

	it('should render input with the proper value', () => {
		const { container } = render(IcSendAmount, {
			props,
			context: mockContext
		});

		const input: HTMLInputElement | null = container.querySelector(amountSelector);

		expect(input?.value).toBe(`${props.amount}`);
	});

	it('should show balance error on input if there is not enough funds', async () => {
		const { container, getByText } = render(IcSendAmount, {
			props: {
				...props,
				amount: undefined
			},
			context: mockContext
		});

		const input: HTMLInputElement | null = container.querySelector(amountSelector);

		assertNonNullish(input);

		await fireEvent.input(input, { target: { value: `${newAmount}` } });

		await waitFor(() => {
			expect(input?.value).toBe(`${newAmount}`);
			expect(getByText(en.send.assertion.insufficient_funds)).toBeInTheDocument();
		});
	});

	it('should not show balance error on input if there is enough funds', async () => {
		balancesStore.set({
			id: ICP_TOKEN.id,
			data: { data: 500000000000n, certified: true }
		});

		const { container, getByText } = render(IcSendAmount, {
			props: {
				...props,
				amount: undefined
			},
			context: mockContext
		});

		const input: HTMLInputElement | null = container.querySelector(amountSelector);

		assertNonNullish(input);

		await fireEvent.input(input, { target: { value: `${newAmount}` } });

		await waitFor(() => {
			expect(input?.value).toBe(`${newAmount}`);
			expect(() => getByText(en.send.assertion.insufficient_funds)).toThrow();
		});
	});
});
