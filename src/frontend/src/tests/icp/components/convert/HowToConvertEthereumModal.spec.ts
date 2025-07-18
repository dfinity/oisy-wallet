import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import {
	ETH_FEE_CONTEXT_KEY,
	initEthFeeContext,
	initEthFeeStore,
	type EthFeeContext
} from '$eth/stores/eth-fee.store';
import HowToConvertEthereumModal from '$icp/components/convert/HowToConvertEthereumModal.svelte';
import { HOW_TO_CONVERT_ETHEREUM_INFO } from '$lib/constants/test-ids.constants';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('HowToConvertEthereumModal', () => {
	const props = {
		sourceToken: ETHEREUM_TOKEN,
		destinationToken: ICP_TOKEN
	};

	const mockContext = () =>
		new Map<symbol, EthFeeContext>([
			[
				ETH_FEE_CONTEXT_KEY,
				initEthFeeContext({
					feeStore: initEthFeeStore(),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeExchangeRateStore: writable(100),
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
				})
			]
		]);

	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();
		mockPage.mock({ network: ETHEREUM_NETWORK_ID.description });
	});

	it('should render convert info on initial render', () => {
		const { getByTestId } = render(HowToConvertEthereumModal, {
			props,
			context: mockContext()
		});

		expect(getByTestId(HOW_TO_CONVERT_ETHEREUM_INFO)).toBeInTheDocument();
	});
});
