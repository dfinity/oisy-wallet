import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import HowToConvertEthereumModal from '$icp/components/convert/HowToConvertEthereumModal.svelte';
import { HOW_TO_CONVERT_ETHEREUM_INFO } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { render } from '@testing-library/svelte';

// We need to mock these nested dependencies too because otherwise there is an error raise in the importing of `WebSocket` from `ws` inside the `ethers/provider` package
vi.mock('ethers/providers', () => {
	const provider = vi.fn();
	return { EtherscanProvider: provider, InfuraProvider: provider, JsonRpcProvider: provider };
});

describe('HowToConvertEthereumModal', () => {
	const mockContext = () =>
		new Map<symbol, SendContext>([
			[
				SEND_CONTEXT_KEY,
				initSendContext({
					sendPurpose: 'convert-eth-to-cketh',
					token: ETHEREUM_TOKEN
				})
			]
		]);

	it('should render convert info on initial render', () => {
		const { getByTestId } = render(HowToConvertEthereumModal, {
			context: mockContext()
		});

		expect(getByTestId(HOW_TO_CONVERT_ETHEREUM_INFO)).toBeInTheDocument();
	});
});
