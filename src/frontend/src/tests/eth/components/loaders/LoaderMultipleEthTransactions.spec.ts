import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import * as nftEnv from '$env/nft.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import {
	ETHEREUM_TOKEN_ID,
	SEPOLIA_TOKEN_ID,
	SUPPORTED_ETHEREUM_TOKENS
} from '$env/tokens/tokens.eth.env';
import LoaderMultipleEthTransactions from '$eth/components/loaders/LoaderMultipleEthTransactions.svelte';
import { loadEthereumTransactions } from '$eth/services/eth-transactions.services';
import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { getIdbEthTransactions } from '$lib/api/idb-transactions.api';
import * as appConstants from '$lib/constants/app.constants';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { syncTransactionsFromCache } from '$lib/services/listener.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { createMockErc1155CustomTokens } from '$tests/mocks/erc1155-tokens.mock';
import { createMockErc20UserTokens } from '$tests/mocks/erc20-tokens.mock';
import { createMockErc721CustomTokens } from '$tests/mocks/erc721-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

vi.mock('@dfinity/utils', async () => {
	const actual = await vi.importActual('@dfinity/utils');
	return {
		...actual,
		debounce: (fn: () => void) => fn // Execute immediately instead of debouncing
	};
});

vi.mock('$eth/services/eth-transactions.services', () => ({
	loadEthereumTransactions: vi.fn()
}));

vi.mock('$lib/services/listener.services', () => ({
	syncTransactionsFromCache: vi.fn()
}));

vi.mock('$lib/utils/time.utils', () => ({
	randomWait: vi.fn()
}));

describe('LoaderMultipleEthTransactions', () => {
	const timeout = WALLET_TIMER_INTERVAL_MILLIS;

	const mockMainnetErc20CertifiedUserTokens = createMockErc20UserTokens({
		n: 2,
		networkEnv: 'mainnet'
	});

	const mockSepoliaErc20CertifiedUserTokens = createMockErc20UserTokens({
		n: 3,
		networkEnv: 'testnet'
	});

	const mockErc20CertifiedUserTokens = [
		...mockMainnetErc20CertifiedUserTokens,
		...mockSepoliaErc20CertifiedUserTokens
	];

	const mockMainnetErc721CustomTokens = createMockErc721CustomTokens({
		n: 4,
		networkEnv: 'mainnet'
	});

	const mockTestnetErc721CustomTokens = createMockErc721CustomTokens({
		n: 5,
		networkEnv: 'testnet'
	});

	const mockErc721CertifiedCustomTokens = [
		...mockMainnetErc721CustomTokens,
		...mockTestnetErc721CustomTokens
	];

	const mockMainnetErc1155CustomTokens = createMockErc1155CustomTokens({
		n: 6,
		networkEnv: 'mainnet'
	});

	const mockTestnetErc1155CustomTokens = createMockErc1155CustomTokens({
		n: 7,
		networkEnv: 'testnet'
	});

	const mockErc1155CertifiedCustomTokens = [
		...mockMainnetErc1155CustomTokens,
		...mockTestnetErc1155CustomTokens
	];

	const mockAdditionalCertifiedTokens = createMockErc20UserTokens({
		n: 8,
		networkEnv: 'mainnet',
		start: 2
	});

	const mockErc20UserTokens = mockErc20CertifiedUserTokens.map(({ data: token }) => token);

	const mockErc721CustomTokens = mockErc721CertifiedCustomTokens.map(({ data: token }) => token);

	const mockErc1155CustomTokens = mockErc1155CertifiedCustomTokens.map(({ data: token }) => token);

	const mockAdditionalTokens = mockAdditionalCertifiedTokens.map(({ data: token }) => token);

	const allExpectedTokens = [
		...SUPPORTED_ETHEREUM_TOKENS,
		...mockErc20UserTokens,
		...SUPPORTED_EVM_TOKENS,
		...mockErc721CustomTokens,
		...mockErc1155CustomTokens
	];

	const props = { children: mockSnippet };

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		vi.stubGlobal(
			'setTimeout',
			vi.fn(() => 123456789)
		);

		mockAuthStore();

		setupTestnetsStore('enabled');
		setupUserNetworksStore('allEnabled');

		vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => false);

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll(mockErc20CertifiedUserTokens);

		erc721CustomTokensStore.resetAll();
		erc721CustomTokensStore.setAll(mockErc721CertifiedCustomTokens);

		erc1155CustomTokensStore.resetAll();
		erc1155CustomTokensStore.setAll(mockErc1155CertifiedCustomTokens);

		ethTransactionsStore.reinitialize();

		vi.spyOn(nftEnv, 'NFTS_ENABLED', 'get').mockImplementation(() => true);
	});

	afterEach(() => {
		vi.unstubAllGlobals();

		vi.useRealTimers();
	});

	describe('on mount', () => {
		it('should sync balances from the IDB cache', async () => {
			render(LoaderMultipleEthTransactions, props);

			await tick();

			expect(syncTransactionsFromCache).toHaveBeenCalledTimes(allExpectedTokens.length);

			allExpectedTokens.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
				expect(syncTransactionsFromCache).toHaveBeenNthCalledWith(index + 1, {
					principal: mockIdentity.getPrincipal(),
					tokenId,
					networkId,
					getIdbTransactions: getIdbEthTransactions,
					transactionsStore: ethTransactionsStore
				});
			});
		});

		it('should not sync balances from the IDB cache if not signed in', async () => {
			mockAuthStore(null);

			render(LoaderMultipleEthTransactions, props);

			await tick();

			expect(syncTransactionsFromCache).not.toHaveBeenCalled();
		});

		it('should sync balances from the IDB cache only for tokens that have not been initialized', async () => {
			ethTransactionsStore.set({ tokenId: allExpectedTokens[0].id, transactions: [] });

			render(LoaderMultipleEthTransactions, props);

			await tick();

			expect(syncTransactionsFromCache).toHaveBeenCalledTimes(allExpectedTokens.length - 1);

			allExpectedTokens.slice(1).forEach(({ id: tokenId, network: { id: networkId } }, index) => {
				expect(syncTransactionsFromCache).toHaveBeenNthCalledWith(index + 1, {
					principal: mockIdentity.getPrincipal(),
					tokenId,
					networkId,
					getIdbTransactions: getIdbEthTransactions,
					transactionsStore: ethTransactionsStore
				});
			});
		});
	});

	it('should load transactions for all Ethereum and Sepolia tokens (native and ERC20) when testnets flag is enabled', async () => {
		render(LoaderMultipleEthTransactions, props);

		await vi.advanceTimersByTimeAsync(timeout);

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(allExpectedTokens.length);

		allExpectedTokens.forEach(({ id: tokenId, network: { id: networkId }, standard }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, {
				tokenId,
				networkId,
				standard
			});
		});
	});

	it('should not load transactions multiple times for the same list if the stores do not change', async () => {
		setupTestnetsStore('enabled');

		render(LoaderMultipleEthTransactions, props);

		await vi.advanceTimersByTimeAsync(timeout);

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(allExpectedTokens.length);

		allExpectedTokens.forEach(({ id: tokenId, network: { id: networkId }, standard }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, {
				tokenId,
				networkId,
				standard
			});
		});

		await vi.advanceTimersByTimeAsync(timeout);

		// same number of calls as before
		expect(loadEthereumTransactions).toHaveBeenCalledTimes(allExpectedTokens.length);

		allExpectedTokens.forEach(({ id: tokenId, network: { id: networkId }, standard }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, {
				tokenId,
				networkId,
				standard
			});
		});
	});

	it('should not load transactions for testnet tokens when testnets flag is disabled', async () => {
		setupTestnetsStore('disabled');

		render(LoaderMultipleEthTransactions, props);

		await vi.advanceTimersByTimeAsync(timeout);

		const expectedTokens = allExpectedTokens.filter(({ network: { env } }) => env === 'mainnet');

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);

		expectedTokens.forEach(({ id: tokenId, network: { id: networkId }, standard }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, {
				tokenId,
				networkId,
				standard
			});
		});

		expect(loadEthereumTransactions).not.toHaveBeenCalledWith({
			networkId: SEPOLIA_NETWORK_ID,
			tokenId: SEPOLIA_TOKEN_ID
		});
	});

	it('should not load transactions for mainnet tokens when Ethereum mainnet is disabled', async () => {
		setupTestnetsStore('enabled');
		setupUserNetworksStore('onlyTestnets');

		render(LoaderMultipleEthTransactions, props);

		await vi.advanceTimersByTimeAsync(timeout);

		const expectedTokens = allExpectedTokens.filter(({ network: { env } }) => env === 'testnet');

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);

		expectedTokens.forEach(({ id: tokenId, network: { id: networkId }, standard }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, {
				tokenId,
				networkId,
				standard
			});
		});

		expect(loadEthereumTransactions).not.toHaveBeenCalledWith({
			networkId: ETHEREUM_NETWORK_ID,
			tokenId: ETHEREUM_TOKEN_ID
		});
	});

	it('should load transactions twice for the same tokens when the stores change', async () => {
		const mockLoadEthereumTransactions = vi.mocked(loadEthereumTransactions);
		mockLoadEthereumTransactions.mockResolvedValue({ success: true });

		const mockAdditionalTokens = createMockErc20UserTokens({
			n: 13,
			networkEnv: 'mainnet',
			start: 100
		});

		render(LoaderMultipleEthTransactions, props);

		await vi.advanceTimersByTimeAsync(timeout);

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(allExpectedTokens.length);

		allExpectedTokens.forEach(({ id: tokenId, network: { id: networkId }, standard }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, {
				tokenId,
				networkId,
				standard
			});
		});

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll([...mockErc20CertifiedUserTokens, ...mockAdditionalTokens]);

		await vi.advanceTimersByTimeAsync(timeout);

		// the number of calls as before (twice) + mockAdditionalTokens.length
		const index = allExpectedTokens.map(isTokenErc20).lastIndexOf(true);
		const expectedNewTokens = [
			...allExpectedTokens,
			...allExpectedTokens.slice(0, index + 1),
			...mockAdditionalTokens.map(({ data: token }) => token),
			...allExpectedTokens.slice(index + 1)
		];

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedNewTokens.length);

		expectedNewTokens.forEach(({ id: tokenId, network: { id: networkId }, standard }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, {
				tokenId,
				networkId,
				standard
			});
		});
	});

	it('should load transactions for new tokens when they are added', async () => {
		const mockLoadEthereumTransactions = vi.mocked(loadEthereumTransactions);
		mockLoadEthereumTransactions.mockResolvedValue({ success: true });

		render(LoaderMultipleEthTransactions, props);

		await vi.advanceTimersByTimeAsync(timeout);

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(allExpectedTokens.length);

		allExpectedTokens.forEach(({ id: tokenId, network: { id: networkId }, standard }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, {
				tokenId,
				networkId,
				standard
			});
		});

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll([
			...mockErc20CertifiedUserTokens,
			...mockAdditionalCertifiedTokens
		]);

		await vi.advanceTimersByTimeAsync(timeout);

		// the number of calls as before (twice) + mockAdditionalTokens.length
		const index = allExpectedTokens.map(isTokenErc20).lastIndexOf(true);
		const expectedNewTokens = [
			...allExpectedTokens,
			...allExpectedTokens.slice(0, index + 1),
			...mockAdditionalTokens,
			...allExpectedTokens.slice(index + 1)
		];

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedNewTokens.length);

		expectedNewTokens.forEach(({ id: tokenId, network: { id: networkId }, standard }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, {
				tokenId,
				networkId,
				standard
			});
		});

		const mockNewAdditionalTokens = createMockErc20UserTokens({
			n: 17,
			networkEnv: 'mainnet',
			start: 100
		});

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll([
			...mockErc20CertifiedUserTokens,
			...mockAdditionalCertifiedTokens,
			...mockNewAdditionalTokens
		]);

		await vi.advanceTimersByTimeAsync(timeout);

		// the number of calls as before (twice) + mockAdditionalTokens.length
		const expectedNewTokensWithSepolia = [
			...expectedNewTokens,
			...allExpectedTokens.slice(0, index + 1),
			...mockAdditionalTokens,
			...mockNewAdditionalTokens.map(({ data: token }) => token),
			...allExpectedTokens.slice(index + 1)
		];

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedNewTokensWithSepolia.length);

		expectedNewTokensWithSepolia.forEach(
			({ id: tokenId, network: { id: networkId }, standard }, index) => {
				expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, {
					tokenId,
					networkId,
					standard
				});
			}
		);
	});

	it('should load transactions in the next call if it failed the first time', async () => {
		const mockLoadEthereumTransactions = vi.mocked(loadEthereumTransactions);
		mockLoadEthereumTransactions
			.mockResolvedValueOnce({ success: false })
			.mockResolvedValue({ success: true });

		render(LoaderMultipleEthTransactions, props);

		await vi.advanceTimersByTimeAsync(timeout);

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(allExpectedTokens.length);

		allExpectedTokens.forEach(({ id: tokenId, network: { id: networkId }, standard }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, {
				tokenId,
				networkId,
				standard
			});
		});

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll([
			...mockErc20CertifiedUserTokens,
			...mockAdditionalCertifiedTokens
		]);

		await vi.advanceTimersByTimeAsync(timeout);

		// the number of calls as before (twice) + mockAdditionalTokens.length
		const index = allExpectedTokens.map(isTokenErc20).lastIndexOf(true);
		const expectedNewTokens = [
			...allExpectedTokens,
			...allExpectedTokens.slice(0, index + 1),
			...mockAdditionalTokens,
			...allExpectedTokens.slice(index + 1)
		];

		expectedNewTokens.forEach(({ id: tokenId, network: { id: networkId }, standard }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, {
				tokenId,
				networkId,
				standard
			});
		});
	});
});
