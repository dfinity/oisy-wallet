import * as ethEnv from '$env/networks/networks.eth.env';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import LoaderMultipleEthTransactions from '$eth/components/loaders/LoaderMultipleEthTransactions.svelte';
import { loadEthereumTransactions } from '$eth/services/eth-transactions.services';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import * as appContants from '$lib/constants/app.constants';
import { createMockErc20UserTokens } from '$tests/mocks/erc20-tokens.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { render, waitFor } from '@testing-library/svelte';
import type { MockedFunction } from 'vitest';

vi.mock('$eth/services/eth-transactions.services', () => ({
	loadEthereumTransactions: vi.fn()
}));

describe('LoaderMultipleEthTransactions', () => {
	const timeout = 10000;

	const mockMainnetErc20UserTokens = createMockErc20UserTokens({ n: 2, networkEnv: 'mainnet' });

	const mockSepoliaErc20UserTokens = createMockErc20UserTokens({ n: 3, networkEnv: 'testnet' });

	const mockErc20UserTokens = [...mockMainnetErc20UserTokens, ...mockSepoliaErc20UserTokens];

	const mockAdditionalTokens = createMockErc20UserTokens({
		n: 5,
		networkEnv: 'mainnet',
		start: 2
	});

	beforeEach(() => {
		vi.clearAllMocks();

		setupTestnetsStore('reset');

		vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => true);

		vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => false);

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll(mockErc20UserTokens);
	});

	it('should load transactions for all Ethereum and Sepolia tokens (native and ERC20) when testnets flag is enabled', async () => {
		setupTestnetsStore('enabled');

		render(LoaderMultipleEthTransactions);

		await waitFor(
			() => {
				// mockErc20UserTokens.length + both native tokens (Ethereum and Sepolia)
				expect(loadEthereumTransactions).toHaveBeenCalledTimes(mockErc20UserTokens.length + 2);
			},
			{ timeout }
		);
	});

	it('should not load transactions more times for the same list if the stores do not change', async () => {
		render(LoaderMultipleEthTransactions);

		await waitFor(
			() => {
				// mockErc20UserTokens.length + Ethereum native token
				expect(loadEthereumTransactions).toHaveBeenCalledTimes(mockErc20UserTokens.length + 1);
			},
			{ timeout }
		);

		await new Promise((resolve) => setTimeout(resolve, 3000));

		// same number of calls as before
		expect(loadEthereumTransactions).toHaveBeenCalledTimes(mockErc20UserTokens.length + 1);
	});

	it('should not load transactions for native Sepolia token when testnets flag is disabled', async () => {
		render(LoaderMultipleEthTransactions);

		await waitFor(
			() => {
				expect(loadEthereumTransactions).toHaveBeenCalledTimes(mockErc20UserTokens.length + 1);
				expect(loadEthereumTransactions).not.toHaveBeenCalledWith({
					networkId: SEPOLIA_NETWORK_ID,
					tokenId: SEPOLIA_TOKEN_ID
				});
			},
			{ timeout }
		);
	});

	it('should not load transactions for native Ethereum token when Ethereum mainnet is disabled', async () => {
		setupTestnetsStore('enabled');
		vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => false);

		render(LoaderMultipleEthTransactions);

		await waitFor(
			() => {
				expect(loadEthereumTransactions).toHaveBeenCalledTimes(mockErc20UserTokens.length + 1);
				expect(loadEthereumTransactions).not.toHaveBeenCalledWith({
					networkId: ETHEREUM_NETWORK_ID,
					tokenId: ETHEREUM_TOKEN_ID
				});
			},
			{ timeout }
		);
	});

	it('should not load transactions twice for the same tokens even if the stores change', async () => {
		const mockLoadEthereumTransactions = loadEthereumTransactions as MockedFunction<
			typeof loadEthereumTransactions
		>;
		mockLoadEthereumTransactions.mockResolvedValue({ success: true });

		const mockAdditionalTokens = createMockErc20UserTokens({
			n: 1,
			networkEnv: 'mainnet',
			start: 2
		});

		render(LoaderMultipleEthTransactions);

		await waitFor(
			() => {
				// mockErc20UserTokens.length + Ethereum native token
				expect(loadEthereumTransactions).toHaveBeenCalledTimes(mockErc20UserTokens.length + 1);
			},
			{ timeout }
		);

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll([...mockErc20UserTokens, ...mockAdditionalTokens]);

		await waitFor(
			() => {
				// the number of calls as before + mockAdditionalTokens.length
				expect(loadEthereumTransactions).toHaveBeenCalledTimes(
					mockErc20UserTokens.length + 1 + mockAdditionalTokens.length
				);
				expect(loadEthereumTransactions).not.toHaveBeenCalledTimes(
					2 * (mockErc20UserTokens.length + 1) + mockAdditionalTokens.length
				);
			},
			{ timeout }
		);
	});

	it('should load transactions for new tokens when they are added', async () => {
		const mockLoadEthereumTransactions = loadEthereumTransactions as MockedFunction<
			typeof loadEthereumTransactions
		>;
		mockLoadEthereumTransactions.mockResolvedValue({ success: true });

		render(LoaderMultipleEthTransactions);

		await waitFor(
			() => {
				// mockErc20UserTokens.length + Ethereum native token
				expect(loadEthereumTransactions).toHaveBeenCalledTimes(mockErc20UserTokens.length + 1);
			},
			{ timeout }
		);

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll([...mockErc20UserTokens, ...mockAdditionalTokens]);

		await waitFor(
			() => {
				``;
				// the number of calls as before + mockAdditionalTokens.length
				expect(loadEthereumTransactions).toHaveBeenCalledTimes(
					mockErc20UserTokens.length + 1 + mockAdditionalTokens.length
				);
			},
			{ timeout }
		);

		setupTestnetsStore('enabled');

		await waitFor(
			() => {
				// the number of calls of the first render + the number of additional tokens + Sepolia native token
				expect(loadEthereumTransactions).toHaveBeenCalledTimes(
					mockErc20UserTokens.length + 1 + mockAdditionalTokens.length + 1
				);
			},
			{ timeout }
		);
	});

	it('should load transactions in the next call if it failed the first time', async () => {
		const mockLoadEthereumTransactions = loadEthereumTransactions as MockedFunction<
			typeof loadEthereumTransactions
		>;
		mockLoadEthereumTransactions
			.mockResolvedValueOnce({ success: false })
			.mockResolvedValue({ success: true });

		render(LoaderMultipleEthTransactions);

		await waitFor(
			() => {
				expect(loadEthereumTransactions).toHaveBeenCalledTimes(mockErc20UserTokens.length + 1);
			},
			{ timeout }
		);

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll([...mockErc20UserTokens, ...mockAdditionalTokens]);

		await waitFor(
			() => {
				expect(loadEthereumTransactions).toHaveBeenCalledTimes(
					// the number of calls as before + mockAdditionalTokens.length + the failed call
					mockErc20UserTokens.length + 1 + mockAdditionalTokens.length + 1
				);
			},
			{ timeout }
		);
	});
}, 60000);
