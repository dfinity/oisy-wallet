import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import HarvestStakeFees from '$eth/components/stake/harvest-autopilot/HarvestStakeFees.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('HarvestStakeFees', () => {
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
			feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
		})
	);

	const emptyStore = initEthFeeStore();

	const emptyContext = new Map([]);
	emptyContext.set(
		ETH_FEE_CONTEXT_KEY,
		initEthFeeContext({
			feeStore: emptyStore,
			feeSymbolStore: writable(undefined),
			feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
			feeDecimalsStore: writable(undefined)
		})
	);

	it('should render the network fee label', () => {
		const { getByText } = render(HarvestStakeFees, {
			context: mockContext
		});

		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
	});

	it('should render the fee amount with symbol', () => {
		const { container } = render(HarvestStakeFees, {
			context: mockContext
		});

		expect(container).toHaveTextContent(ETHEREUM_TOKEN.symbol);
	});

	it('should not render fee display when fee symbol is not available', () => {
		const { queryByText } = render(HarvestStakeFees, {
			context: emptyContext
		});

		expect(queryByText(en.fee.text.network_fee)).not.toBeInTheDocument();
	});
});
