import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import {
	estimatedGasFee as estimatedGasFeeUtils,
	formatGasFeeInGwei,
	maxGasFee as maxGasFeeUtils
} from '$eth/utils/fee.utils';
import { ZERO } from '$lib/constants/app.constants';
import { CONVERT_AMOUNT_EXCHANGE_VALUE } from '$lib/constants/test-ids.constants';
import { currentCurrency } from '$lib/derived/currency.derived';
import { currentLanguage } from '$lib/derived/i18n.derived';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { formatCurrency, formatToken } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';

describe('EthFeeDisplay', () => {
	const mockStoreValues = {
		maxFeePerGas: 1000n,
		maxGasFee: 1000n,
		gas: 1000n,
		maxPriorityFeePerGas: 1000n,
		baseFeePerGas: 500n
	};
	const store = initEthFeeStore();
	store.setFee(mockStoreValues);

	const mockContext = new Map([]);
	mockContext.set(
		ETH_FEE_CONTEXT_KEY,
		initEthFeeContext({
			feeStore: store,
			feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
			feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
			feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
		})
	);

	const expectedText = (value: bigint | undefined) =>
		`${formatToken({
			value: value ?? ZERO,
			displayDecimals: ETHEREUM_TOKEN.decimals,
			unitName: ETHEREUM_TOKEN.decimals
		})} ${ETHEREUM_TOKEN.symbol}`;

	// An estimate is quoted in gwei, so it is the one case that does not read in the token.
	const expectedGweiText = (value: bigint | undefined) =>
		`${formatGasFeeInGwei({ value: value ?? ZERO, language: get(currentLanguage) })} ${en.fee.text.gwei}`;

	it('renders provided fee', () => {
		const { container } = render(EthFeeDisplay, {
			context: mockContext
		});

		expect(container).toHaveTextContent(expectedText(maxGasFeeUtils(mockStoreValues)));
	});

	it('renders the estimated fee when asked for it', () => {
		const { container } = render(EthFeeDisplay, {
			context: mockContext,
			props: { estimated: true }
		});

		expect(container).toHaveTextContent(expectedGweiText(estimatedGasFeeUtils(mockStoreValues)));
	});

	it('converts the estimate from the token amount, not from the gwei it displays', () => {
		// A realistic fee on purpose: the values above are small enough that both conversions land
		// under the display threshold and render the same string, which would hide the bug.
		const realisticFee = {
			maxFeePerGas: 100_000_000_000n,
			maxPriorityFeePerGas: 1_000_000_000n,
			baseFeePerGas: 20_000_000_000n,
			gas: 21_000n
		};

		const exchangeRate = 3_000;

		const feeStore = initEthFeeStore();
		feeStore.setFee(realisticFee);

		const context = new Map([]);
		context.set(
			ETH_FEE_CONTEXT_KEY,
			initEthFeeContext({
				feeStore,
				feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
				feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
				feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
				feeExchangeRateStore: writable(exchangeRate)
			})
		);

		const { getByTestId } = render(EthFeeDisplay, { context, props: { estimated: true } });

		// 21_000 gas at 21 gwei effective is 0.000441 ETH, so $1.32 at this rate. Converting the
		// displayed 441,000 gwei instead would read north of a million dollars.
		const expected = formatCurrency({
			value:
				Number(
					formatToken({
						value: estimatedGasFeeUtils(realisticFee) ?? ZERO,
						displayDecimals: ETHEREUM_TOKEN.decimals,
						unitName: ETHEREUM_TOKEN.decimals
					})
				) * exchangeRate,
			currency: get(currentCurrency),
			exchangeRate: get(currencyExchangeStore),
			language: get(currentLanguage),
			notBelowThreshold: true
		});

		expect(getByTestId(CONVERT_AMOUNT_EXCHANGE_VALUE)).toHaveTextContent(expected as string);
	});

	it('prices the estimate on a caller-supplied gas limit', () => {
		const gas = 2000n;

		const { container } = render(EthFeeDisplay, {
			context: mockContext,
			props: { estimated: true, gas }
		});

		expect(container).toHaveTextContent(
			expectedGweiText(estimatedGasFeeUtils({ ...mockStoreValues, gas }))
		);
	});
});
