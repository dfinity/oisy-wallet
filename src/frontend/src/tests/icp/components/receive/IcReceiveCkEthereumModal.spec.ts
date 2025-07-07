import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import {
	ETH_FEE_CONTEXT_KEY,
	initEthFeeContext,
	initEthFeeStore,
	type EthFeeContext
} from '$eth/stores/eth-fee.store';
import IcReceiveCkEthereumModal from '$icp/components/receive/IcReceiveCkEthereumModal.svelte';
import {
	RECEIVE_TOKEN_CONTEXT_KEY,
	initReceiveTokenContext,
	type ReceiveTokenContext
} from '$icp/stores/receive-token.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('IcReceiveCkEthereumModal', () => {
	const props = {
		sourceToken: ETHEREUM_TOKEN,
		destinationToken: ICP_TOKEN
	};

	const mockContext = () =>
		new Map<symbol, ReceiveTokenContext | EthFeeContext>([
			[
				ETH_FEE_CONTEXT_KEY,
				initEthFeeContext({
					feeStore: initEthFeeStore(),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeExchangeRateStore: writable(100),
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
				})
			],
			[
				RECEIVE_TOKEN_CONTEXT_KEY,
				initReceiveTokenContext({ token: ETHEREUM_TOKEN, close: () => {}, open: async () => {} })
			]
		]);

	it('should render receive info on initial render', () => {
		const { getByText } = render(IcReceiveCkEthereumModal, {
			props,
			context: mockContext()
		});

		expect(getByText(en.receive.text.receive)).toBeInTheDocument();
	});
});
