import {
	BASE_NETWORK_ID,
	BASE_SEPOLIA_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.base.env';
import { SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SEPOLIA_PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import {
	BASE_ETH_TOKEN,
	BASE_ETH_TOKEN_ID,
	BASE_SEPOLIA_ETH_TOKEN,
	BASE_SEPOLIA_ETH_TOKEN_ID
} from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import {
	ETHEREUM_TOKEN,
	ETHEREUM_TOKEN_ID,
	SEPOLIA_TOKEN,
	SEPOLIA_TOKEN_ID
} from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import LoaderEthTransactions from '$eth/components/loaders/LoaderEthTransactions.svelte';
import {
	loadEthereumTransactions,
	reloadEthereumTransactions
} from '$eth/services/eth-transactions.services';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { getIdbEthTransactions } from '$lib/api/idb-transactions.api';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { syncTransactionsFromCache } from '$lib/services/listener.services';
import { token } from '$lib/stores/token.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';

vi.mock('$eth/services/eth-transactions.services', () => ({
	loadEthereumTransactions: vi.fn(),
	reloadEthereumTransactions: vi.fn()
}));

vi.mock('$lib/services/listener.services', () => ({
	syncTransactionsFromCache: vi.fn()
}));

describe('LoaderEthTransactions', () => {
	const mockLoadTransactions = vi.mocked(loadEthereumTransactions);
	const mockReloadTransactions = vi.mocked(reloadEthereumTransactions);

	const props = { children: mockSnippet };

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		setupTestnetsStore('enabled');
		setupUserNetworksStore('allEnabled');

		mockLoadTransactions.mockResolvedValue({ success: true });
		mockReloadTransactions.mockResolvedValue({ success: true });

		mockPage.reset();
		token.reset();

		erc20UserTokensStore.setAll([
			{ data: { ...SEPOLIA_PEPE_TOKEN, enabled: true }, certified: false }
		]);
	});

	describe('on mount', () => {
		it('should sync balances from the IDB cache', async () => {
			mockPage.mock({ token: ETHEREUM_TOKEN.name });
			token.set(BASE_ETH_TOKEN);

			render(LoaderEthTransactions, props);

			await tick();

			expect(syncTransactionsFromCache).toHaveBeenCalledExactlyOnceWith({
				principal: mockIdentity.getPrincipal(),
				tokenId: BASE_ETH_TOKEN_ID,
				networkId: BASE_NETWORK_ID,
				getIdbTransactions: getIdbEthTransactions,
				transactionsStore: ethTransactionsStore
			});
		});

		it('should not sync balances from the IDB cache if not signed in', async () => {
			mockPage.mock({ token: ETHEREUM_TOKEN.name });
			token.set(BASE_ETH_TOKEN);

			mockAuthStore(null);

			render(LoaderEthTransactions, props);

			await tick();

			expect(syncTransactionsFromCache).not.toHaveBeenCalled();
		});

		it('should not sync balances from the IDB cache if transactions store is already initialized', async () => {
			mockPage.mock({ token: ETHEREUM_TOKEN.name });
			token.set(BASE_ETH_TOKEN);

			ethTransactionsStore.set({ tokenId: BASE_ETH_TOKEN_ID, transactions: [] });

			render(LoaderEthTransactions, props);

			await tick();

			expect(syncTransactionsFromCache).not.toHaveBeenCalled();
		});

		it('should sync balances from the IDB cache if transactions store is not initialized for the specific token', async () => {
			mockPage.mock({ token: ETHEREUM_TOKEN.name });
			token.set(BASE_ETH_TOKEN);

			ethTransactionsStore.reset(BASE_ETH_TOKEN_ID);
			ethTransactionsStore.set({ tokenId: ETHEREUM_TOKEN_ID, transactions: [] });

			render(LoaderEthTransactions, props);

			await tick();

			expect(syncTransactionsFromCache).toHaveBeenCalledExactlyOnceWith({
				principal: mockIdentity.getPrincipal(),
				tokenId: BASE_ETH_TOKEN.id,
				networkId: BASE_ETH_TOKEN.network.id,
				getIdbTransactions: getIdbEthTransactions,
				transactionsStore: ethTransactionsStore
			});
		});
	});

	it('should not load transactions if token is not initialized', async () => {
		render(LoaderEthTransactions, props);

		await waitFor(() => {
			expect(loadEthereumTransactions).not.toHaveBeenCalled();
		});
	});

	it('should not load transactions when token is initialized and but no token is set', async () => {
		render(LoaderEthTransactions, props);

		mockPage.mock({ token: ICP_TOKEN.name });

		await waitFor(() => {
			expect(loadEthereumTransactions).not.toHaveBeenCalled();
		});
	});

	it('should not load transactions when token is initialized and is not an Ethereum token', async () => {
		render(LoaderEthTransactions, props);

		mockPage.mock({ token: ICP_TOKEN.name });
		token.set(ICP_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).not.toHaveBeenCalled();
		});
	});

	it('should not load transactions when token is initialized but does not match the network', async () => {
		render(LoaderEthTransactions, props);

		mockPage.mock({ token: ETHEREUM_TOKEN.name });
		token.set(BASE_ETH_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).not.toHaveBeenCalled();
		});
	});

	it('should load transactions when token is initialized and is an Ethereum native token', async () => {
		render(LoaderEthTransactions, props);

		mockPage.mock({ token: SEPOLIA_TOKEN.name, network: SEPOLIA_TOKEN.network.id.description });
		token.set(SEPOLIA_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({
				tokenId: SEPOLIA_TOKEN_ID,
				networkId: SEPOLIA_NETWORK_ID,
				standard: SEPOLIA_TOKEN.standard
			});
		});
	});

	it('should load transactions when token is initialized and is an EVM native token', async () => {
		render(LoaderEthTransactions, props);

		mockPage.mock({
			token: BASE_SEPOLIA_ETH_TOKEN.name,
			network: BASE_SEPOLIA_ETH_TOKEN.network.id.description
		});
		token.set(BASE_SEPOLIA_ETH_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({
				tokenId: BASE_SEPOLIA_ETH_TOKEN_ID,
				networkId: BASE_SEPOLIA_NETWORK_ID,
				standard: BASE_SEPOLIA_ETH_TOKEN.standard
			});
		});
	});

	it('should load transactions when token is initialized and is an ERC20 token', async () => {
		render(LoaderEthTransactions, props);

		mockPage.mock({
			token: SEPOLIA_PEPE_TOKEN.name,
			network: SEPOLIA_PEPE_TOKEN.network.id.description
		});
		token.set(SEPOLIA_PEPE_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({
				tokenId: SEPOLIA_PEPE_TOKEN.id,
				networkId: SEPOLIA_PEPE_TOKEN.network.id,
				standard: SEPOLIA_PEPE_TOKEN.standard
			});
		});
	});

	it('should load transactions when token is initialized and is changed to an Ethereum native token', async () => {
		render(LoaderEthTransactions, props);

		mockPage.mock({ token: ICP_TOKEN.name, network: ICP_TOKEN.network.id.description });
		token.set(ICP_TOKEN);

		mockPage.mock({ token: SEPOLIA_TOKEN.name, network: SEPOLIA_TOKEN.network.id.description });
		token.set(SEPOLIA_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledOnce();
			expect(loadEthereumTransactions).toHaveBeenCalledWith({
				tokenId: SEPOLIA_TOKEN_ID,
				networkId: SEPOLIA_NETWORK_ID,
				standard: SEPOLIA_TOKEN.standard
			});
		});
	});

	it('should load transactions twice when token is changed but still an Ethereum token', async () => {
		render(LoaderEthTransactions, props);

		mockPage.mock({ token: SEPOLIA_TOKEN.name, network: SEPOLIA_TOKEN.network.id.description });
		token.set(SEPOLIA_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({
				tokenId: SEPOLIA_TOKEN_ID,
				networkId: SEPOLIA_NETWORK_ID,
				standard: SEPOLIA_TOKEN.standard
			});
		});

		mockPage.mock({
			token: SEPOLIA_PEPE_TOKEN.name,
			network: SEPOLIA_TOKEN.network.id.description
		});
		token.set(SEPOLIA_PEPE_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({
				tokenId: SEPOLIA_PEPE_TOKEN.id,
				networkId: SEPOLIA_PEPE_TOKEN.network.id,
				standard: SEPOLIA_PEPE_TOKEN.standard
			});
		});

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(2);
	});

	it('should not call the load function everytime the token changes but it was already loaded before', async () => {
		render(LoaderEthTransactions, props);

		const n = 3;

		Array.from({ length: n }).forEach(() => {
			mockPage.mock({ token: ICP_TOKEN.name, network: ICP_TOKEN.network.id.description });
			token.set(ICP_TOKEN);

			mockPage.mock({ token: SEPOLIA_TOKEN.name, network: SEPOLIA_TOKEN.network.id.description });
			token.set(SEPOLIA_TOKEN);
		});

		await waitFor(() => {
			expect(loadEthereumTransactions).not.toHaveBeenCalledTimes(n);
			expect(loadEthereumTransactions).toHaveBeenCalledOnce();
		});
	});

	it('should re-call the load function if it fails the first time but the token is the same', async () => {
		mockLoadTransactions.mockResolvedValue({ success: false });

		mockPage.mock({
			token: SEPOLIA_PEPE_TOKEN.name,
			network: SEPOLIA_PEPE_TOKEN.network.id.description
		});
		token.set(SEPOLIA_PEPE_TOKEN);

		render(LoaderEthTransactions, props);

		mockPage.mock({ token: ICP_TOKEN.name, network: ICP_TOKEN.network.id.description });
		token.set(ICP_TOKEN);

		mockPage.mock({
			token: SEPOLIA_PEPE_TOKEN.name,
			network: SEPOLIA_PEPE_TOKEN.network.id.description
		});
		token.set(SEPOLIA_PEPE_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledTimes(2);
		});
	});

	it('should call the load function everytime it re-renders even if the token is was already loaded in a previous rendering', async () => {
		render(LoaderEthTransactions, props);

		mockPage.mock({ token: SEPOLIA_TOKEN.name, network: SEPOLIA_TOKEN.network.id.description });
		token.set(SEPOLIA_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledOnce();
		});

		render(LoaderEthTransactions, props);

		mockPage.mock({ token: ICP_TOKEN.name, network: ICP_TOKEN.network.id.description });
		token.set(ICP_TOKEN);

		mockPage.mock({ token: SEPOLIA_TOKEN.name, network: SEPOLIA_TOKEN.network.id.description });
		token.set(SEPOLIA_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledTimes(2);
		});
	});

	it('should call the load function every interval', async () => {
		vi.useFakeTimers();

		render(LoaderEthTransactions, props);

		mockPage.mock({ token: SEPOLIA_TOKEN.name, network: SEPOLIA_TOKEN.network.id.description });
		token.set(SEPOLIA_TOKEN);

		await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

		expect(reloadEthereumTransactions).toHaveBeenCalledOnce();

		await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

		expect(reloadEthereumTransactions).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS * 5);

		expect(reloadEthereumTransactions).toHaveBeenCalledTimes(7);

		vi.useRealTimers();
	});
});
