import BtcSendAmount from '$btc/components/send/BtcSendAmount.svelte';
import { BTC_MINIMUM_AMOUNT } from '$btc/constants/btc.constants';
import { convertSatoshisToBtc } from '$btc/utils/btc-send.utils';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { TOKEN_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { initSendContext, SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('BtcSendAmount', () => {
	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			token: BTC_MAINNET_TOKEN
		})
	);

	const props = {
		amount: 1000,
		amountError: undefined
	};
	const newAmount = 10000;
	const belowMinimumAmountInBtc = '0.000005'; // 500 satoshis in BTC terms (below 700 satoshis minimum)

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;

	beforeEach(() => {
		// Reset balance store
		balancesStore.reset(BTC_MAINNET_TOKEN.id);
	});

	it('should render input with the proper value', () => {
		const { container } = render(BtcSendAmount, {
			props,
			context: mockContext
		});

		const input: HTMLInputElement | null = container.querySelector(amountSelector);

		expect(input?.value).toBe(`${props.amount}`);
	});

	it('should show insufficient funds error when there is not enough balance', async () => {
		const { container, getByText } = render(BtcSendAmount, {
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

	it('should not show balance error when there is enough funds', async () => {
		balancesStore.set({
			id: BTC_MAINNET_TOKEN.id,
			data: { data: 500000000n, certified: true } // 5 BTC in satoshis
		});

		const { container, getByText } = render(BtcSendAmount, {
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

	it('should show minimum BTC amount error when amount is below minimum threshold', async () => {
		// Set a high balance to ensure we don't get insufficient funds error
		balancesStore.set({
			id: BTC_MAINNET_TOKEN.id,
			data: { data: 10000000000n, certified: true } // 100 BTC in satoshis
		});

		const expectedErrorMessage = replacePlaceholders(en.send.assertion.minimum_btc_amount, {
			$amount: convertSatoshisToBtc(BTC_MINIMUM_AMOUNT)
		});

		// Render AFTER setting balance
		const { container, getByText } = render(BtcSendAmount, {
			props: {
				...props,
				amount: undefined
			},
			context: mockContext
		});

		const input: HTMLInputElement | null = container.querySelector(amountSelector);

		assertNonNullish(input);

		// Input 0.000005 BTC (which is 500 satoshis, below the 700 satoshi minimum)
		await fireEvent.input(input, { target: { value: belowMinimumAmountInBtc } });

		await waitFor(() => {
			expect(input?.value).toBe(belowMinimumAmountInBtc);
			expect(getByText(expectedErrorMessage)).toBeInTheDocument();
		});
	});

	it('should show invalid amount error for zero amount', async () => {
		balancesStore.set({
			id: BTC_MAINNET_TOKEN.id,
			data: { data: 500000000n, certified: true }
		});

		const { container, getByText } = render(BtcSendAmount, {
			props: {
				...props,
				amount: undefined
			},
			context: mockContext
		});

		const input: HTMLInputElement | null = container.querySelector(amountSelector);

		assertNonNullish(input);

		await fireEvent.input(input, { target: { value: '0' } });

		await waitFor(() => {
			expect(input?.value).toBe('0');
			expect(getByText(en.send.assertion.amount_invalid)).toBeInTheDocument();
		});
	});
});
