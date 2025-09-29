import { ARBITRUM_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import AiAssistantReviewSendTokenTool from '$lib/components/ai-assistant/AiAssistantReviewSendTokenTool.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { AI_ASSISTANT_SEND_TOKENS_BUTTON } from '$lib/constants/test-ids.constants';
import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
import type { Token } from '$lib/types/token';
import * as solanaApi from '$sol/api/solana.api';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { render } from '@testing-library/svelte';

describe('AiAssistantReviewSendTokenTool', () => {
	const mockContext = (token: Token) =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token })]]);

	const props = {
		amount: 1,
		address: mockEthAddress,
		sendEnabled: true
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(solanaApi, 'estimatePriorityFee').mockResolvedValue(ZERO);
	});

	it('renders correctly for a BTC token', () => {
		const { getByTestId, container } = render(AiAssistantReviewSendTokenTool, {
			props: {
				...props,
				token: BTC_MAINNET_TOKEN
			},
			context: mockContext(BTC_MAINNET_TOKEN)
		});

		expect(getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON)).toBeInTheDocument();
		expect(container).toHaveTextContent(BTC_MAINNET_TOKEN.symbol);
		expect(container).toHaveTextContent(BTC_MAINNET_TOKEN.network.name);
	});

	it('renders correctly for an ETH token', () => {
		const { getByTestId, container } = render(AiAssistantReviewSendTokenTool, {
			props: {
				...props,
				token: ETHEREUM_TOKEN
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON)).toBeInTheDocument();
		expect(container).toHaveTextContent(ETHEREUM_TOKEN.symbol);
		expect(container).toHaveTextContent(ETHEREUM_TOKEN.network.name);
	});

	it('renders correctly for an EVM token', () => {
		const { getByTestId, container } = render(AiAssistantReviewSendTokenTool, {
			props: {
				...props,
				token: ARBITRUM_ETH_TOKEN
			},
			context: mockContext(ARBITRUM_ETH_TOKEN)
		});

		expect(getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON)).toBeInTheDocument();
		expect(container).toHaveTextContent(ARBITRUM_ETH_TOKEN.symbol);
		expect(container).toHaveTextContent(ARBITRUM_ETH_TOKEN.network.name);
	});

	it('renders correctly for a SOL token', () => {
		const { getByTestId, container } = render(AiAssistantReviewSendTokenTool, {
			props: {
				...props,
				token: SOLANA_TOKEN
			},
			context: mockContext(SOLANA_TOKEN)
		});

		expect(getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON)).toBeInTheDocument();
		expect(container).toHaveTextContent(SOLANA_TOKEN.symbol);
		expect(container).toHaveTextContent(SOLANA_TOKEN.network.name);
	});

	it('renders correctly for an IC token', () => {
		const { getByTestId, container } = render(AiAssistantReviewSendTokenTool, {
			props: {
				...props,
				token: ICP_TOKEN
			},
			context: mockContext(ICP_TOKEN)
		});

		expect(getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON)).toBeInTheDocument();
		expect(container).toHaveTextContent(ICP_TOKEN.symbol);
		expect(container).toHaveTextContent(ICP_TOKEN.network.name);
	});
});
