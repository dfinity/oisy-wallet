import { SEPOLIA_NETWORK_ID } from '$env/networks/networks.env';
import { SEPOLIA_PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { SEPOLIA_TOKEN, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import LoaderEthTransactions from '$eth/components/loaders/LoaderEthTransactions.svelte';
import { loadEthereumTransactions } from '$eth/services/eth-transactions.services';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import { token } from '$lib/stores/token.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render, waitFor } from '@testing-library/svelte';
import type { MockedFunction } from 'vitest';

vi.mock('$eth/services/eth-transactions.services', () => ({
	loadEthereumTransactions: vi.fn()
}));

describe('LoaderEthTransactions', () => {
	const mockLoadTransactions = loadEthereumTransactions as MockedFunction<
		typeof loadEthereumTransactions
	>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockLoadTransactions.mockResolvedValue({ success: true });

		mockPage.reset();
		token.reset();

		erc20UserTokensStore.setAll([
			{ data: { ...SEPOLIA_PEPE_TOKEN, enabled: true }, certified: false }
		]);
	});

	it('should not load transactions if token is not initialized', async () => {
		render(LoaderEthTransactions);

		await waitFor(() => {
			expect(loadEthereumTransactions).not.toHaveBeenCalled();
		});
	});

	it('should not load transactions when token is initialized and but no token is set', async () => {
		render(LoaderEthTransactions);

		mockPage.mock({ token: ICP_TOKEN.name });

		await waitFor(() => {
			expect(loadEthereumTransactions).not.toHaveBeenCalled();
		});
	});

	it('should not load transactions when token is initialized and is not an Ethereum token', async () => {
		render(LoaderEthTransactions);

		mockPage.mock({ token: ICP_TOKEN.name });
		token.set(ICP_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).not.toHaveBeenCalled();
		});
	});

	it('should load transactions when token is initialized and is an Ethereum native token', async () => {
		render(LoaderEthTransactions);

		mockPage.mock({ token: SEPOLIA_TOKEN.name });
		token.set(SEPOLIA_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({
				tokenId: SEPOLIA_TOKEN_ID,
				networkId: SEPOLIA_NETWORK_ID
			});
		});
	});

	it('should load transactions when token is initialized and is an ERC20 token', async () => {
		render(LoaderEthTransactions);

		mockPage.mock({ token: SEPOLIA_PEPE_TOKEN.name });
		token.set(SEPOLIA_PEPE_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({
				tokenId: SEPOLIA_PEPE_TOKEN.id,
				networkId: SEPOLIA_PEPE_TOKEN.network.id
			});
		});
	});

	it('should load transactions when token is initialized and is changed to an Ethereum native token', async () => {
		render(LoaderEthTransactions);

		mockPage.mock({ token: ICP_TOKEN.name });
		token.set(ICP_TOKEN);

		mockPage.mock({ token: SEPOLIA_TOKEN.name });
		token.set(SEPOLIA_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledOnce();
			expect(loadEthereumTransactions).toHaveBeenCalledWith({
				tokenId: SEPOLIA_TOKEN_ID,
				networkId: SEPOLIA_NETWORK_ID
			});
		});
	});

	it('should load transactions twice when token is changed but still an Ethereum token', async () => {
		render(LoaderEthTransactions);

		mockPage.mock({ token: SEPOLIA_TOKEN.name });
		token.set(SEPOLIA_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({
				tokenId: SEPOLIA_TOKEN_ID,
				networkId: SEPOLIA_NETWORK_ID
			});
		});

		mockPage.mock({ token: SEPOLIA_PEPE_TOKEN.name });
		token.set(SEPOLIA_PEPE_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({
				tokenId: SEPOLIA_PEPE_TOKEN.id,
				networkId: SEPOLIA_PEPE_TOKEN.network.id
			});
		});

		expect(loadEthereumTransactions).toHaveBeenCalledTimes(2);
	});

	it('should not call the load function everytime the token changes but it was already loaded before', async () => {
		render(LoaderEthTransactions);

		const n = 3;

		Array.from({ length: n }).forEach(() => {
			mockPage.mock({ token: ICP_TOKEN.name });
			token.set(ICP_TOKEN);

			mockPage.mock({ token: SEPOLIA_TOKEN.name });
			token.set(SEPOLIA_TOKEN);
		});

		await waitFor(() => {
			expect(loadEthereumTransactions).not.toHaveBeenCalledTimes(n);
			expect(loadEthereumTransactions).toHaveBeenCalledOnce();
		});
	});

	it('should re-call the load function if it fails the first time but the token is the same', async () => {
		mockLoadTransactions.mockResolvedValue({ success: false });

		mockPage.mock({ token: SEPOLIA_PEPE_TOKEN.name });
		token.set(SEPOLIA_PEPE_TOKEN);

		render(LoaderEthTransactions);

		mockPage.mock({ token: ICP_TOKEN.name });
		token.set(ICP_TOKEN);

		mockPage.mock({ token: SEPOLIA_PEPE_TOKEN.name });
		token.set(SEPOLIA_PEPE_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledTimes(2);
		});
	});

	it('should call the load function everytime it re-renders even if the token is was already loaded in a previous rendering', async () => {
		render(LoaderEthTransactions);

		mockPage.mock({ token: SEPOLIA_TOKEN.name });
		token.set(SEPOLIA_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledOnce();
		});

		render(LoaderEthTransactions);

		mockPage.mock({ token: ICP_TOKEN.name });
		token.set(ICP_TOKEN);

		mockPage.mock({ token: SEPOLIA_TOKEN.name });
		token.set(SEPOLIA_TOKEN);

		await waitFor(() => {
			expect(loadEthereumTransactions).toHaveBeenCalledTimes(2);
		});
	});
});
