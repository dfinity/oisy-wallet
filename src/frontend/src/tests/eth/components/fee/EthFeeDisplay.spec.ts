import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import { maxGasFee as maxGasFeeUtils } from '$eth/utils/fee.utils';
import { ZERO } from '$lib/constants/app.constants';
import { formatToken } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('EthFeeDisplay', () => {
	const mockStoreValues = {
		maxFeePerGas: 1000n,
		maxGasFee: 1000n,
		gas: 1000n,
		maxPriorityFeePerGas: 1000n
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
			feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
			isFeeGasless: writable(undefined)
		})
	);

	it('renders provided fee', () => {
		const { container } = render(EthFeeDisplay, {
			context: mockContext
		});

		expect(container).toHaveTextContent(
			`${formatToken({
				value: maxGasFeeUtils(mockStoreValues) ?? ZERO,
				displayDecimals: ETHEREUM_TOKEN.decimals,
				unitName: ETHEREUM_TOKEN.decimals
			})} ${ETHEREUM_TOKEN.symbol}`
		);
	});

	it('passes isFeeGasless=true to FeeDisplay', () => {
		const contextWithGasless = new Map();
		contextWithGasless.set(
			ETH_FEE_CONTEXT_KEY,
			initEthFeeContext({
				feeStore: store,
				feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
				feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
				feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
				isFeeGasless: writable(true)
			})
		);

		const { container } = render(EthFeeDisplay, {
			context: contextWithGasless
		});

		expect(container).toHaveTextContent(en.swap.text.gasless);
		expect(container).not.toHaveTextContent(ETHEREUM_TOKEN.symbol);
	});

	it('passes isFeeGasless=false to FeeDisplay', () => {
		const contextWithoutGasless = new Map();
		contextWithoutGasless.set(
			ETH_FEE_CONTEXT_KEY,
			initEthFeeContext({
				feeStore: store,
				feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
				feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
				feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
				isFeeGasless: writable(false)
			})
		);

		const { container } = render(EthFeeDisplay, {
			context: contextWithoutGasless
		});

		expect(container).not.toHaveTextContent(en.swap.text.gasless);
		expect(container).toHaveTextContent(ETHEREUM_TOKEN.symbol);
	});

	it('passes isFeeGasless=undefined to FeeDisplay', () => {
		const { container } = render(EthFeeDisplay, {
			context: mockContext
		});

		expect(container).not.toHaveTextContent(en.swap.text.gasless);
		expect(container).toHaveTextContent(ETHEREUM_TOKEN.symbol);
	});
});
