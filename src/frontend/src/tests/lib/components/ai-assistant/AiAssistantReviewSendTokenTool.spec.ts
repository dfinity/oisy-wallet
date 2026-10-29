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
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { ARBITRUM_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.eth.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { POL_MAINNET_TOKEN } from '$env/tokens/tokens-evm/tokens-polygon/tokens.pol.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import * as sendServices from '$eth/services/send.services';
import * as ethFeeStore from '$eth/stores/eth-fee.store';
import * as ckEthServices from '$icp-eth/services/cketh.services';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import AiAssistantReviewSendTokenTool from '$lib/components/ai-assistant/AiAssistantReviewSendTokenTool.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { AI_ASSISTANT_SEND_TOKENS_BUTTON } from '$lib/constants/test-ids.constants';
import { ethAddressStore } from '$lib/stores/address.store';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { Token } from '$lib/types/token';
import * as solanaApi from '$sol/api/solana.api';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockCkMinterInfo } from '$tests/mocks/ck-minter.mock';
import { mockEthAddress, mockEthAddress3 } from '$tests/mocks/eth.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

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

	beforeEach(() => {
		vi.clearAllMocks();

		allUtxosStore.reset();
		feeRatePercentilesStore.reset();
		btcPendingSentTransactionsStore.reset();

		vi.spyOn(solanaApi, 'estimatePriorityFee').mockResolvedValue(ZERO);
		vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
			utxos: [],
			tip_block_hash: new Uint8Array(),
			tip_height: 100,
			next_page: []
		});
		vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(1000n);
		vi.spyOn(
			btcPendingSentTransactionsServices,
			'loadBtcPendingSentTransactions'
		).mockResolvedValue({ success: true });
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

	describe('network the send signs on', () => {
		beforeEach(() => {
			mockPage.reset();

			setupTestnetsStore('enabled');
			setupUserNetworksStore('allEnabled');

			mockAuthStore();

			ethAddressStore.set({ certified: true, data: mockEthAddress });

			[ETHEREUM_TOKEN, SEPOLIA_TOKEN, BASE_ETH_TOKEN, POL_MAINNET_TOKEN].forEach(({ id }) => {
				ckEthMinterInfoStore.set({ id, data: { data: mockCkMinterInfo, certified: true } });
				balancesStore.set({ id, data: { data: 10n ** 21n, certified: true } });
			});

			vi.spyOn(ckEthServices, 'loadCkEthMinterInfo').mockResolvedValue();

			const { subscribe } = writable<ethFeeStore.FeeStoreData>({
				gas: 21000n,
				maxFeePerGas: 100n,
				maxPriorityFeePerGas: 100n
			});

			vi.spyOn(ethFeeStore, 'initEthFeeStore').mockImplementation(() => ({
				subscribe,
				setFee: vi.fn()
			}));
		});

		afterEach(() => {
			setupTestnetsStore('reset');
		});

		const send = async (token: Token) => {
			const sendSpy = vi.spyOn(sendServices, 'send').mockResolvedValue({ hash: 'hash', nonce: 1 });

			const { getByTestId } = render(AiAssistantReviewSendTokenTool, {
				props: {
					...props,
					address: mockEthAddress3,
					token
				},
				context: mockContext(token)
			});

			const button = getByTestId(AI_ASSISTANT_SEND_TOKENS_BUTTON);

			await waitFor(() => expect(button).toBeEnabled());

			await fireEvent.click(button);

			await waitFor(() => expect(sendSpy).toHaveBeenCalledOnce());

			return sendSpy.mock.calls[0][0];
		};

		it('signs on the token network when the navigation selects another EVM network', async () => {
			mockPage.mockNetwork(BASE_NETWORK.id.description);

			const { sourceNetwork, token } = await send(POL_MAINNET_TOKEN);

			expect(sourceNetwork).toEqual(POLYGON_MAINNET_NETWORK);
			expect(token).toEqual(POL_MAINNET_TOKEN);
		});

		it('pays the fee in the native token of the token network', async () => {
			mockPage.mockNetwork(BASE_NETWORK.id.description);

			await send(POL_MAINNET_TOKEN);

			expect(ckEthServices.loadCkEthMinterInfo).toHaveBeenCalledWith(
				expect.objectContaining({ tokenId: POL_MAINNET_TOKEN.id })
			);
			expect(ckEthServices.loadCkEthMinterInfo).not.toHaveBeenCalledWith(
				expect.objectContaining({ tokenId: BASE_ETH_TOKEN.id })
			);
		});

		it('signs a Sepolia token on Sepolia when no network is selected', async () => {
			const { sourceNetwork } = await send(SEPOLIA_TOKEN);

			expect(sourceNetwork).toEqual(SEPOLIA_NETWORK);
		});

		it('signs an Ethereum token on Ethereum when the navigation selects Sepolia', async () => {
			mockPage.mockNetwork(SEPOLIA_NETWORK.id.description);

			const { sourceNetwork } = await send(ETHEREUM_TOKEN);

			expect(sourceNetwork).toEqual(ETHEREUM_NETWORK);
		});
	});
});
