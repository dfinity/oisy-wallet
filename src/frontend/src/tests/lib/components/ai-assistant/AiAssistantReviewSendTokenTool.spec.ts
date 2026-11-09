import * as btcPendingSentTransactionsServices from '$btc/services/btc-pending-sent-transactions.services';
import * as btcUtxosService from '$btc/services/btc-utxos.service';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import {
	UTXOS_FEE_CONTEXT_KEY,
	initUtxosFeeStore,
	type UtxosFeeContext
} from '$btc/stores/utxos-fee.store';
import { ARBITRUM_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.eth.env';
import {
	BTC_MAINNET_TOKEN,
	BTC_REGTEST_TOKEN,
	BTC_TESTNET_TOKEN
} from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import AiAssistantReviewSendTokenTool from '$lib/components/ai-assistant/AiAssistantReviewSendTokenTool.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { AI_ASSISTANT_SEND_TOKENS_BUTTON } from '$lib/constants/test-ids.constants';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore
} from '$lib/stores/address.store';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { Token } from '$lib/types/token';
import * as solanaApi from '$sol/api/solana.api';
import { mockBtcAddress, mockBtcP2SHAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { render, waitFor } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

vi.mock('$eth/providers/alchemy.providers', () => ({
	initMinedTransactionsListener: () => ({
		disconnect: async () => {}
	})
}));

describe('AiAssistantReviewSendTokenTool', () => {
	const mockContext = (token: Token) =>
		new Map<symbol, SendContext | UtxosFeeContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token })],
			[UTXOS_FEE_CONTEXT_KEY, { store: initUtxosFeeStore() }]
		]);

	const props = {
		amount: 1,
		address: mockEthAddress,
		sendEnabled: true,
		sendCompleted: false,
		id: 'mock-id'
	};

	let getUtxosQuerySpy: MockInstance<typeof bitcoinApi.getUtxosQuery>;
	let loadBtcPendingSentTransactionsSpy: MockInstance<
		typeof btcPendingSentTransactionsServices.loadBtcPendingSentTransactions
	>;

	beforeEach(() => {
		vi.clearAllMocks();

		allUtxosStore.reset();
		feeRatePercentilesStore.reset();
		btcPendingSentTransactionsStore.reset();
		btcAddressMainnetStore.reset();
		btcAddressTestnetStore.reset();
		btcAddressRegtestStore.reset();

		vi.spyOn(solanaApi, 'estimatePriorityFee').mockResolvedValue(ZERO);
		getUtxosQuerySpy = vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
			utxos: [],
			tip_block_hash: new Uint8Array(),
			tip_height: 100,
			next_page: []
		});
		vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(1000n);
		loadBtcPendingSentTransactionsSpy = vi
			.spyOn(btcPendingSentTransactionsServices, 'loadBtcPendingSentTransactions')
			.mockResolvedValue({ success: true });
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

	it("loads the BTC fee from the user's own address, not from the recipient", async () => {
		btcAddressMainnetStore.set({ certified: true, data: mockBtcAddress });

		render(AiAssistantReviewSendTokenTool, {
			props: {
				...props,
				address: mockBtcP2SHAddress,
				token: BTC_MAINNET_TOKEN
			},
			context: mockContext(BTC_MAINNET_TOKEN)
		});

		await waitFor(() => {
			expect(getUtxosQuerySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ address: mockBtcAddress })
			);
			expect(loadBtcPendingSentTransactionsSpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ address: mockBtcAddress })
			);
		});
	});

	it.each([
		{ token: BTC_TESTNET_TOKEN, addressStore: btcAddressTestnetStore },
		{ token: BTC_REGTEST_TOKEN, addressStore: btcAddressRegtestStore }
	])("loads the BTC fee from the user's $token.name address", async ({ token, addressStore }) => {
		const networkAddress = `${token.network.name} address`;

		btcAddressMainnetStore.set({ certified: true, data: mockBtcAddress });
		addressStore.set({ certified: true, data: networkAddress });

		render(AiAssistantReviewSendTokenTool, {
			props: {
				...props,
				address: mockBtcP2SHAddress,
				token
			},
			context: mockContext(token)
		});

		await waitFor(() => {
			expect(getUtxosQuerySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ address: networkAddress })
			);
			expect(loadBtcPendingSentTransactionsSpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ address: networkAddress })
			);
		});
	});

	it("loads the BTC fee from the user's address once it loads after the review renders", async () => {
		const { getByTestId } = render(AiAssistantReviewSendTokenTool, {
			props: {
				...props,
				address: mockBtcP2SHAddress,
				token: BTC_MAINNET_TOKEN
			},
			context: mockContext(BTC_MAINNET_TOKEN)
		});

		expect(getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON)).toBeDisabled();
		expect(getUtxosQuerySpy).not.toHaveBeenCalled();
		expect(loadBtcPendingSentTransactionsSpy).not.toHaveBeenCalled();

		btcAddressMainnetStore.set({ certified: true, data: mockBtcAddress });

		await waitFor(() => {
			expect(getUtxosQuerySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ address: mockBtcAddress })
			);
			expect(loadBtcPendingSentTransactionsSpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ address: mockBtcAddress })
			);
		});
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
