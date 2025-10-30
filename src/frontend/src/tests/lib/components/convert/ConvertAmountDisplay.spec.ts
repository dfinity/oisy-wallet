import { BTC_MAINNET_SYMBOL } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import ConvertAmountDisplay from '$lib/components/convert/ConvertAmountDisplay.svelte';
import {
	CONVERT_AMOUNT_DISPLAY_SKELETON,
	CONVERT_AMOUNT_DISPLAY_VALUE,
	CONVERT_AMOUNT_EXCHANGE_SKELETON,
	CONVERT_AMOUNT_EXCHANGE_VALUE
} from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('ConvertAmountDisplay', () => {
	const amount = 20.25;
	const exchangeRate = 0.01;
	const symbol = BTC_MAINNET_SYMBOL;

	const props = {
		amount,
		exchangeRate,
		symbol
	};

	const store = initEthFeeStore();

	const createContext = (isFeeGasless: boolean | undefined = undefined) => {
		const context = new Map();
		context.set(
			ETH_FEE_CONTEXT_KEY,
			initEthFeeContext({
				feeStore: store,
				feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
				feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
				feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
				isFeeGasless: writable(isFeeGasless)
			})
		);
		return context;
	};

	const valueTestId = CONVERT_AMOUNT_DISPLAY_VALUE;
	const skeletonTestId = CONVERT_AMOUNT_DISPLAY_SKELETON;
	const exchangeSkeleton = CONVERT_AMOUNT_EXCHANGE_SKELETON;
	const exchangeValue = CONVERT_AMOUNT_EXCHANGE_VALUE;

	it('should display correct values if amount is provided', () => {
		const { getByTestId } = render(ConvertAmountDisplay, {
			props,
			context: createContext()
		});

		expect(getByTestId(valueTestId)).toHaveTextContent('20.25 BTC');
		expect(getByTestId(exchangeValue)).toHaveTextContent('$0.20');
	});

	it('should display zero label if amount is zero and label is provided', () => {
		const { getByTestId } = render(ConvertAmountDisplay, {
			props: { ...props, zeroAmountLabel: 'Free', amount: 0 },
			context: createContext()
		});

		expect(getByTestId(valueTestId)).toHaveTextContent('Free');
		expect(getByTestId(exchangeValue)).toHaveTextContent('$0.00');
	});

	it('should display zero if amount is zero and label is not provided', () => {
		const { getByTestId } = render(ConvertAmountDisplay, {
			props: { ...props, amount: 0 },
			context: createContext()
		});

		expect(getByTestId(valueTestId)).toHaveTextContent('0 BTC');
		expect(getByTestId(exchangeValue)).toHaveTextContent('$0.00');
	});

	it('should display skeletons if amount is not provided', () => {
		const { amount: _, ...newProps } = props;
		const { getByTestId } = render(ConvertAmountDisplay, {
			props: newProps,
			context: createContext()
		});

		expect(getByTestId(skeletonTestId)).toBeInTheDocument();
		expect(getByTestId(exchangeSkeleton)).toBeInTheDocument();
	});

	describe('isFeeGasless from context', () => {
		it('shows gasless text when isFeeGasless=true', () => {
			const { getByTestId } = render(ConvertAmountDisplay, {
				props,
				context: createContext(true)
			});

			expect(getByTestId(valueTestId)).toHaveTextContent(en.swap.text.gasless);
			expect(getByTestId(valueTestId)).not.toHaveTextContent(symbol);
		});

		it('shows amount when isFeeGasless=false', () => {
			const { getByTestId } = render(ConvertAmountDisplay, {
				props,
				context: createContext(false)
			});

			expect(getByTestId(valueTestId)).not.toHaveTextContent(en.swap.text.gasless);
			expect(getByTestId(valueTestId)).toHaveTextContent(`${amount} ${symbol}`);
		});

		it('shows amount when isFeeGasless=undefined', () => {
			const { getByTestId } = render(ConvertAmountDisplay, {
				props,
				context: createContext(undefined)
			});

			expect(getByTestId(valueTestId)).not.toHaveTextContent(en.swap.text.gasless);
			expect(getByTestId(valueTestId)).toHaveTextContent(`${amount} ${symbol}`);
		});

		it('shows $0.00 exchange rate when isFeeGasless=true', () => {
			const { getByTestId } = render(ConvertAmountDisplay, {
				props,
				context: createContext(true)
			});

			expect(getByTestId(exchangeValue)).toHaveTextContent('$0.00');
		});

		it('shows correct exchange rate when isFeeGasless=false', () => {
			const { getByTestId } = render(ConvertAmountDisplay, {
				props,
				context: createContext(false)
			});

			expect(getByTestId(exchangeValue)).toHaveTextContent('$0.20');
		});
	});
});
