import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
import { FEE_CONTEXT_KEY, initFeeContext, initFeeStore } from '$eth/stores/fee.store';
import { maxGasFee as maxGasFeeUtils } from '$eth/utils/fee.utils';
import { ZERO } from '$lib/constants/app.constants';
import { formatToken } from '$lib/utils/format.utils';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('EthFeeDisplay', () => {
	const mockStoreValues = {
		maxFeePerGas: 1000n,
		maxGasFee: 1000n,
		gas: 1000n,
		maxPriorityFeePerGas: 1000n
	};
	const store = initFeeStore();
	store.setFee(mockStoreValues);

	const mockContext = new Map([]);
	mockContext.set(
		FEE_CONTEXT_KEY,
		initFeeContext({
			feeStore: store,
			feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
			feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
			feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
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
});
