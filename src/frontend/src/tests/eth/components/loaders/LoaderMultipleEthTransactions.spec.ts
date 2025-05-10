import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import {
	BASE_ETH_TOKEN,
	BASE_SEPOLIA_ETH_TOKEN
} from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import {
	BNB_MAINNET_TOKEN,
	BNB_TESTNET_TOKEN
} from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import {
	ETHEREUM_TOKEN,
	ETHEREUM_TOKEN_ID,
	SEPOLIA_TOKEN,
	SEPOLIA_TOKEN_ID
} from '$env/tokens/tokens.eth.env';
import LoaderMultipleEthTransactions from '$eth/components/loaders/LoaderMultipleEthTransactions.svelte';
import { loadEthereumTransactions } from '$eth/services/eth-transactions.services';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import * as appContants from '$lib/constants/app.constants';
import { createMockErc20UserTokens } from '$tests/mocks/erc20-tokens.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { render } from '@testing-library/svelte';
import type { MockedFunction } from 'vitest';

vi.mock('$eth/services/eth-transactions.services', () => ({
	loadEthereumTransactions: vi.fn()
}));

describe('LoaderMultipleEthTransactions', () => {
	const timeout = 60000;

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

	const mockAdditionalCertifiedTokens = createMockErc20UserTokens({
		n: 5,
		networkEnv: 'mainnet',
		start: 2
	});

	const mockMainnetErc20UserTokens = mockMainnetErc20CertifiedUserTokens.map(
		({ data: token }) => token
	);

	const mockSepoliaErc20UserTokens = mockSepoliaErc20CertifiedUserTokens.map(
		({ data: token }) => token
	);

	const mockErc20UserTokens = mockErc20CertifiedUserTokens.map(({ data: token }) => token);

	const mockAdditionalTokens = mockAdditionalCertifiedTokens.map(({ data: token }) => token);

	const expectedTokens = [
		ETHEREUM_TOKEN,
		SEPOLIA_TOKEN,
		...mockErc20UserTokens,
		BASE_ETH_TOKEN,
		BASE_SEPOLIA_ETH_TOKEN,
		BNB_MAINNET_TOKEN,
		BNB_TESTNET_TOKEN
	];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		vi.stubGlobal(
			'setInterval',
			vi.fn(() => 123456789)
		);

		setupTestnetsStore('enabled');
		setupUserNetworksStore('allEnabled');

		vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => false);

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll(mockErc20CertifiedUserTokens);
	});

	afterEach(() => {
		vi.unstubAllGlobals();

		vi.useRealTimers();
	});

	it('should load transactions for all Ethereum and Sepolia tokens (native and ERC20) when testnets flag is enabled', async () => {
		render(LoaderMultipleEthTransactions);

		await vi.advanceTimersByTimeAsync(timeout);

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);

		expectedTokens.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, { tokenId, networkId });
		});
	});

	it('should not load transactions multiple times for the same list if the stores do not change', async () => {
		setupTestnetsStore('enabled');

		render(LoaderMultipleEthTransactions);

		await vi.advanceTimersByTimeAsync(timeout);

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);

		expectedTokens.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, { tokenId, networkId });
		});

		await vi.advanceTimersByTimeAsync(timeout);

		// same number of calls as before
		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);

		expectedTokens.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, { tokenId, networkId });
		});
	});

	it('should not load transactions for testnet tokens when testnets flag is disabled', async () => {
		setupTestnetsStore('disabled');

		render(LoaderMultipleEthTransactions);

		await vi.advanceTimersByTimeAsync(timeout);

		const expectedTokens = [
			ETHEREUM_TOKEN,
			...mockMainnetErc20UserTokens,
			BASE_ETH_TOKEN,
			BNB_MAINNET_TOKEN
		];

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);

		expectedTokens.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, { tokenId, networkId });
		});

		expect(loadEthereumTransactions).not.toHaveBeenCalledWith({
			networkId: SEPOLIA_NETWORK_ID,
			tokenId: SEPOLIA_TOKEN_ID
		});
	});

	it('should not load transactions for mainnet tokens when Ethereum mainnet is disabled', async () => {
		setupTestnetsStore('enabled');
		setupUserNetworksStore('onlyTestnets');

		render(LoaderMultipleEthTransactions);

		await vi.advanceTimersByTimeAsync(timeout);

		const expectedTokens = [
			SEPOLIA_TOKEN,
			...mockSepoliaErc20UserTokens,
			BASE_SEPOLIA_ETH_TOKEN,
			BNB_TESTNET_TOKEN
		];

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);

		expectedTokens.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, { tokenId, networkId });
		});

		expect(loadEthereumTransactions).not.toHaveBeenCalledWith({
			networkId: ETHEREUM_NETWORK_ID,
			tokenId: ETHEREUM_TOKEN_ID
		});
	});

	it('should not load transactions twice for the same tokens even if the stores change', async () => {
		const mockLoadEthereumTransactions = loadEthereumTransactions as MockedFunction<
			typeof loadEthereumTransactions
		>;
		mockLoadEthereumTransactions.mockResolvedValue({ success: true });

		const mockAdditionalTokens = createMockErc20UserTokens({
			n: 3,
			networkEnv: 'mainnet',
			start: 2
		});

		render(LoaderMultipleEthTransactions);

		await vi.advanceTimersByTimeAsync(timeout);

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);

		expectedTokens.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, { tokenId, networkId });
		});

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll([...mockErc20CertifiedUserTokens, ...mockAdditionalTokens]);

		await vi.advanceTimersByTimeAsync(timeout);

		// the number of calls as before + mockAdditionalTokens.length
		const expectedNewTokens = [
			...expectedTokens,
			...mockAdditionalTokens.map(({ data: token }) => token)
		];

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedNewTokens.length);

		expectedNewTokens.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, { tokenId, networkId });
		});

		expect(loadEthereumTransactions).not.toHaveBeenCalledTimes(
			2 * (mockErc20UserTokens.length + 1) + mockAdditionalTokens.length
		);
	});

	it('should load transactions for new tokens when they are added', async () => {
		const mockLoadEthereumTransactions = loadEthereumTransactions as MockedFunction<
			typeof loadEthereumTransactions
		>;
		mockLoadEthereumTransactions.mockResolvedValue({ success: true });

		render(LoaderMultipleEthTransactions);

		await vi.advanceTimersByTimeAsync(timeout);

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);

		expectedTokens.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, { tokenId, networkId });
		});

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll([
			...mockErc20CertifiedUserTokens,
			...mockAdditionalCertifiedTokens
		]);

		await vi.advanceTimersByTimeAsync(timeout);

		// the number of calls as before + mockAdditionalTokens.length
		const expectedNewTokens = [...expectedTokens, ...mockAdditionalTokens];

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedNewTokens.length);

		expectedNewTokens.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, { tokenId, networkId });
		});

		const mockNewAdditionalTokens = createMockErc20UserTokens({
			n: 7,
			networkEnv: 'mainnet',
			start: 2
		});

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll([
			...mockErc20CertifiedUserTokens,
			...mockAdditionalCertifiedTokens,
			...mockNewAdditionalTokens
		]);

		await vi.advanceTimersByTimeAsync(timeout);

		// the number of calls as before + the number of new additional tokens
		const expectedNewTokensWithSepolia = [
			...expectedNewTokens,
			...mockNewAdditionalTokens.map(({ data: token }) => token)
		];

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedNewTokensWithSepolia.length);

		expectedNewTokensWithSepolia.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, { tokenId, networkId });
		});
	});

	it('should load transactions in the next call if it failed the first time', async () => {
		const mockLoadEthereumTransactions = loadEthereumTransactions as MockedFunction<
			typeof loadEthereumTransactions
		>;
		mockLoadEthereumTransactions
			.mockResolvedValueOnce({ success: false })
			.mockResolvedValue({ success: true });

		render(LoaderMultipleEthTransactions);

		await vi.advanceTimersByTimeAsync(timeout);

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);

		expectedTokens.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, { tokenId, networkId });
		});

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll([
			...mockErc20CertifiedUserTokens,
			...mockAdditionalCertifiedTokens
		]);

		await vi.advanceTimersByTimeAsync(timeout);

		// the number of calls as before + the failed call + mockAdditionalTokens.length
		const expectedNewTokens = [...expectedTokens, ETHEREUM_TOKEN, ...mockAdditionalTokens];

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedNewTokens.length);

		expectedNewTokens.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, { tokenId, networkId });
		});
	});
});
