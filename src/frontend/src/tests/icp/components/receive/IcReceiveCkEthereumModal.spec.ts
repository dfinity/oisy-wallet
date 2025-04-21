import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import IcReceiveCkEthereumModal from '$icp/components/receive/IcReceiveCkEthereumModal.svelte';
import {
	RECEIVE_TOKEN_CONTEXT_KEY,
	initReceiveTokenContext,
	type ReceiveTokenContext
} from '$icp/stores/receive-token.store';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

// We need to mock these nested dependencies too because otherwise there is an error raise in the importing of `WebSocket` from `ws` inside the `ethers/provider` package
vi.mock('ethers/providers', () => {
	const provider = vi.fn();
	return { EtherscanProvider: provider, InfuraProvider: provider, JsonRpcProvider: provider };
});

describe('IcReceiveCkEthereumModal', () => {
	const mockContext = () =>
		new Map<symbol, SendContext | ReceiveTokenContext>([
			[
				SEND_CONTEXT_KEY,
				initSendContext({
					sendPurpose: 'convert-eth-to-cketh',
					token: ETHEREUM_TOKEN
				})
			],
			[
				RECEIVE_TOKEN_CONTEXT_KEY,
				initReceiveTokenContext({ token: ETHEREUM_TOKEN, close: () => {}, open: async () => {} })
			]
		]);

	it('should render receive info on initial render', () => {
		const { getByText } = render(IcReceiveCkEthereumModal, {
			context: mockContext()
		});

		expect(getByText(en.receive.text.receive)).toBeInTheDocument();
	});
});
