import * as ethEnv from '$env/networks.eth.env';
import LoaderMultipleEthTransactions from '$eth/components/loaders/LoaderMultipleEthTransactions.svelte';
import { loadTransactions } from '$eth/services/transactions.services';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import * as appContants from '$lib/constants/app.constants';
import { testnetsStore } from '$lib/stores/settings.store';
import { createMockErc20UserTokens } from '$tests/mocks/erc20-tokens.mock';
import { render, waitFor } from '@testing-library/svelte';
import type { MockedFunction } from 'vitest';

vi.mock('$eth/services/transactions.services', () => ({
	loadTransactions: vi.fn()
}));

describe('LoaderMultipleEthTransactions', () => {
	const mockMainnetErc20UserTokens = createMockErc20UserTokens({ n: 2, networkEnv: 'mainnet' });

	const mockSepoliaErc20UserTokens = createMockErc20UserTokens({ n: 3, networkEnv: 'testnet' });

	const mockErc20UserTokens = [...mockMainnetErc20UserTokens, ...mockSepoliaErc20UserTokens];

	const mockLoadTransactions = loadTransactions as MockedFunction<typeof loadTransactions>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockLoadTransactions.mockResolvedValue({ success: true });

		testnetsStore.reset({ key: 'testnets' });

		vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => true);

		vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => false);

		erc20UserTokensStore.setAll(mockErc20UserTokens);
	});

	it('should load transactions for all mainnet Ethereum tokens (native and ERC20)', async () => {
		render(LoaderMultipleEthTransactions);

		await waitFor(() => {
			expect(loadTransactions).toHaveBeenCalledTimes(mockMainnetErc20UserTokens.length + 1);
		});
	});

	it('should load transactions for all Ethereum and Sepolia tokens (native and ERC20) when testnets flag is enabled', async () => {
		testnetsStore.set({ key: 'testnets', value: { enabled: true } });
		vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => true);

		render(LoaderMultipleEthTransactions);

		await waitFor(() => {
			expect(loadTransactions).toHaveBeenCalledTimes(mockErc20UserTokens.length + 2);
		});
	});

	it('should load transactions for all Sepolia tokens (native and ERC20) when Ethereum mainnet is disabled', async () => {
		testnetsStore.set({ key: 'testnets', value: { enabled: true } });
		vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementationOnce(() => false);

		render(LoaderMultipleEthTransactions);

		await waitFor(() => {
			expect(loadTransactions).toHaveBeenCalledTimes(mockSepoliaErc20UserTokens.length + 1);
		});
	});

	it('should not load transactions multiple times for the same token', async () => {
		render(LoaderMultipleEthTransactions);

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll(mockErc20UserTokens);

		// erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll(mockErc20UserTokens);

		await waitFor(() => {
			expect(loadTransactions).toHaveBeenCalledTimes(mockErc20UserTokens.length + 1);
		});
	});

	it('should load transactions for new tokens when they are added', async () => {
		const mockAdditionalTokens = createMockErc20UserTokens({
			n: 5,
			networkEnv: 'mainnet',
			start: 2
		});

		render(LoaderMultipleEthTransactions);

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll([...mockMainnetErc20UserTokens, ...mockAdditionalTokens]);

		await waitFor(() => {
			expect(loadTransactions).toHaveBeenCalledTimes(
				mockMainnetErc20UserTokens.length + 1 + mockAdditionalTokens.length
			);
		});
	});
});
