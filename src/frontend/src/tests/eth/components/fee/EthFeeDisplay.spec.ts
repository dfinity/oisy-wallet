import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import {
	estimatedGasFee as estimatedGasFeeUtils,
	maxGasFee as maxGasFeeUtils
} from '$eth/utils/fee.utils';
import { ZERO } from '$lib/constants/app.constants';
import { formatToken } from '$lib/utils/format.utils';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

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

		expect(container).toHaveTextContent(expectedText(estimatedGasFeeUtils(mockStoreValues)));
	});

	it('prices the estimate on a caller-supplied gas limit', () => {
		const gas = 2000n;

		const { container } = render(EthFeeDisplay, {
			context: mockContext,
			props: { estimated: true, gas }
		});

		expect(container).toHaveTextContent(
			expectedText(estimatedGasFeeUtils({ ...mockStoreValues, gas }))
		);
	});
});
