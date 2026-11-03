import BtcSendAmount from '$btc/components/send/BtcSendAmount.svelte';
import { BTC_MINIMUM_AMOUNT } from '$btc/constants/btc.constants';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import { convertSatoshisToBtc } from '$btc/utils/btc-send.utils';
import { calculateFeeSatoshis } from '$btc/utils/btc-utxos.utils';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { MAX_BUTTON, TOKEN_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockUtxosFeeContextEntry } from '$tests/utils/fee.context.test-utils';
import { mockSendContextEntry } from '$tests/utils/send.context.test-utils';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('BtcSendAmount', () => {
	const createMockContext = () =>
		mockContextMap([
			mockSendContextEntry({ token: BTC_MAINNET_TOKEN }),
			mockUtxosFeeContextEntry()
		]);

	const props = {
		amount: 1000,
		amountError: undefined,
		source: mockBtcAddress,
		onTokensList: vi.fn()
	};
	const belowMinimumAmountInBtc = '0.000005'; // 500 satoshis in BTC terms (below 700 satoshis minimum)

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;

	beforeEach(() => {
		// Reset balance store
		balancesStore.reset(BTC_MAINNET_TOKEN.id);

		allUtxosStore.reset();
		btcPendingSentTransactionsStore.reset();
		feeRatePercentilesStore.reset();
	});

	// Regression: the balance counts incoming UTXOs at one confirmation, a send selects at six.
	// Offering the balance as "Max" quoted an amount the selection then rejected for want of funds.
	it('should offer a Max the send can honour, not the whole balance', async () => {
		balancesStore.set({
			id: BTC_MAINNET_TOKEN.id,
			data: { data: 41_000n, certified: true }
		});

		allUtxosStore.setAllUtxos({
			allUtxos: [
				{ value: 1_000n, height: 10, outpoint: { txid: new Uint8Array([1]), vout: 0 } },
				{ value: 40_000n, height: 3, outpoint: { txid: new Uint8Array([2]), vout: 0 } }
			]
		});
		btcPendingSentTransactionsStore.setPendingTransactions({
			address: mockBtcAddress,
			pendingTransactions: []
		});
		feeRatePercentilesStore.setFeeRateFromPercentiles({ feeRateFromPercentiles: 1_000n });

		const expectedMax = formatToken({
			value: 1_000n - calculateFeeSatoshis({ numInputs: 1, feeRateMiliSatoshisPerVByte: 1_000n }),
			unitName: BTC_MAINNET_TOKEN.decimals,
			displayDecimals: BTC_MAINNET_TOKEN.decimals
		});

		const { getByTestId } = render(BtcSendAmount, {
			props,
			context: createMockContext()
		});

		await waitFor(() => {
			expect(getByTestId(MAX_BUTTON)).toHaveTextContent(expectedMax);
		});
	});

	it('should render input with the proper value', () => {
		const { container } = render(BtcSendAmount, {
			props,
			context: createMockContext()
		});

		const input: HTMLInputElement | null = container.querySelector(amountSelector);

		expect(input?.value).toBe(`${props.amount}`);
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
			context: createMockContext()
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
			context: createMockContext()
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
