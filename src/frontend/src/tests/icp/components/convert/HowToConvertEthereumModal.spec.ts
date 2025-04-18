import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import {
	FEE_CONTEXT_KEY,
	initFeeContext,
	initFeeStore,
	type FeeContext
} from '$eth/stores/fee.store';
import HowToConvertEthereumModal from '$icp/components/convert/HowToConvertEthereumModal.svelte';
import { HOW_TO_CONVERT_ETHEREUM_INFO } from '$lib/constants/test-ids.constants';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

// We need to mock these nested dependencies too because otherwise there is an error raise in the importing of `WebSocket` from `ws` inside the `ethers/provider` package
vi.mock('ethers/providers', () => {
	const provider = vi.fn();
	return { EtherscanProvider: provider, InfuraProvider: provider, JsonRpcProvider: provider };
});

describe('HowToConvertEthereumModal', () => {
	const props = {
		sourceToken: ETHEREUM_TOKEN,
		destinationToken: ICP_TOKEN
	};

	const mockContext = () =>
		new Map<symbol, FeeContext>([
			[
				FEE_CONTEXT_KEY,
				initFeeContext({
					feeStore: initFeeStore(),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeExchangeRateStore: writable(100),
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
				})
			]
		]);

	it('should render convert info on initial render', () => {
		const { getByTestId } = render(HowToConvertEthereumModal, {
			props,
			context: mockContext()
		});

		expect(getByTestId(HOW_TO_CONVERT_ETHEREUM_INFO)).toBeInTheDocument();
	});
});
