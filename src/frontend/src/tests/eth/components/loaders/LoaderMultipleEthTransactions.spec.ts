import * as ethEnv from '$env/networks/networks.eth.env';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
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
import { render } from '@testing-library/svelte';
import type { MockedFunction } from 'vitest';

vi.mock('$eth/services/eth-transactions.services', () => ({
	loadEthereumTransactions: vi.fn()
}));

describe('LoaderMultipleEthTransactions', () => {
	const timeout = 60000;

	const mockMainnetErc20UserTokens = createMockErc20UserTokens({ n: 2, networkEnv: 'mainnet' });

	const mockSepoliaErc20UserTokens = createMockErc20UserTokens({ n: 3, networkEnv: 'testnet' });

	const mockErc20CertifiedUserTokens = [
		...mockMainnetErc20UserTokens,
		...mockSepoliaErc20UserTokens
	];

	const mockErc20UserTokens = mockErc20CertifiedUserTokens.map(({ data: token }) => token);

	const mockAdditionalCertifiedTokens = createMockErc20UserTokens({
		n: 5,
		networkEnv: 'mainnet',
		start: 2
	});

	const mockAdditionalTokens = mockAdditionalCertifiedTokens.map(({ data: token }) => token);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		setupTestnetsStore('reset');

		vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => false);

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll(mockErc20CertifiedUserTokens);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should load transactions for all Ethereum and Sepolia tokens (native and ERC20) when testnets flag is enabled', async () => {
		setupTestnetsStore('enabled');

		render(LoaderMultipleEthTransactions);

		await vi.advanceTimersByTimeAsync(timeout);

		const expectedTokens = [...mockErc20UserTokens, ETHEREUM_TOKEN, SEPOLIA_TOKEN];
		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);
		expectedTokens.forEach(({ id: tokenId, network: { id: networkId } }) => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({ tokenId, networkId });
		});
	});

	it('should not load transactions multiple times for the same list if the stores do not change', async () => {
		render(LoaderMultipleEthTransactions);

		await vi.advanceTimersByTimeAsync(timeout);

		const expectedTokens = [...mockErc20UserTokens, ETHEREUM_TOKEN];
		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);
		expectedTokens.forEach(({ id: tokenId, network: { id: networkId } }) => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({ tokenId, networkId });
		});

		await vi.advanceTimersByTimeAsync(timeout);

		// same number of calls as before
		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);
		expectedTokens.forEach(({ id: tokenId, network: { id: networkId } }) => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({ tokenId, networkId });
		});
	});

	it('should not load transactions for native Sepolia token when testnets flag is disabled', async () => {
		render(LoaderMultipleEthTransactions);

		await vi.advanceTimersByTimeAsync(timeout);

		const expectedTokens = [...mockErc20UserTokens, ETHEREUM_TOKEN];
		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);
		expectedTokens.forEach(({ id: tokenId, network: { id: networkId } }) => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({ tokenId, networkId });
		});

		expect(loadEthereumTransactions).not.toHaveBeenCalledWith({
			networkId: SEPOLIA_NETWORK_ID,
			tokenId: SEPOLIA_TOKEN_ID
		});
	});

	it('should not load transactions for native Ethereum token when Ethereum mainnet is disabled', async () => {
		setupTestnetsStore('enabled');
		vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementationOnce(() => false);

		render(LoaderMultipleEthTransactions);

		await vi.advanceTimersByTimeAsync(timeout);

		const expectedTokens = [...mockErc20UserTokens, SEPOLIA_TOKEN];
		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);
		expectedTokens.forEach(({ id: tokenId, network: { id: networkId } }) => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({ tokenId, networkId });
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

		const expectedTokens = [...mockErc20UserTokens, ETHEREUM_TOKEN];
		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);
		expectedTokens.forEach(({ id: tokenId, network: { id: networkId } }) => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({ tokenId, networkId });
		});

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll([...mockErc20CertifiedUserTokens, ...mockAdditionalTokens]);

		await vi.advanceTimersByTimeAsync(timeout);

		// the number of calls as before + mockAdditionalTokens.length
		const expectedNewTokens = [
			...mockAdditionalTokens.map(({ data: token }) => token),
			...mockErc20UserTokens,
			ETHEREUM_TOKEN
		];
		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedNewTokens.length);
		expectedNewTokens.forEach(({ id: tokenId, network: { id: networkId } }) => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({ tokenId, networkId });
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

		const expectedTokens = [...mockErc20UserTokens, ETHEREUM_TOKEN];
		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedTokens.length);
		expectedTokens.forEach(({ id: tokenId, network: { id: networkId } }) => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({ tokenId, networkId });
		});

		erc20UserTokensStore.resetAll();
		erc20UserTokensStore.setAll([
			...mockErc20CertifiedUserTokens,
			...mockAdditionalCertifiedTokens
		]);

		await vi.advanceTimersByTimeAsync(timeout);

		// the number of calls as before + mockAdditionalTokens.length
		const expectedNewTokens = [...mockAdditionalTokens, ...mockErc20UserTokens, ETHEREUM_TOKEN];
		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedNewTokens.length);
		expectedNewTokens.forEach(({ id: tokenId, network: { id: networkId } }) => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({ tokenId, networkId });
		});

		setupTestnetsStore('enabled');

		await vi.advanceTimersByTimeAsync(timeout);

		// the number of calls of the first render + the number of additional tokens + Sepolia native token
		const expectedNewTokensWithSepolia = [
			...mockAdditionalTokens,
			...mockErc20UserTokens,
			ETHEREUM_TOKEN,
			SEPOLIA_TOKEN
		];
		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedNewTokensWithSepolia.length);
		expectedNewTokensWithSepolia.forEach(({ id: tokenId, network: { id: networkId } }) => {
			expect(loadEthereumTransactions).toHaveBeenCalledWith({ tokenId, networkId });
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

		const expectedTokens = [ETHEREUM_TOKEN, ...mockErc20UserTokens];
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

		// the number of calls as before + mockAdditionalTokens.length + the failed call
		const expectedNewTokens = [ETHEREUM_TOKEN, ...mockErc20UserTokens, ...mockAdditionalTokens];
		expect(loadEthereumTransactions).toHaveBeenCalledTimes(expectedNewTokens.length + 1);
		expectedNewTokens.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
			expect(loadEthereumTransactions).toHaveBeenNthCalledWith(index + 1, { tokenId, networkId });
		});
	});
});
