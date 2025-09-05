import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import LoaderEthBalances from '$eth/components/loaders/LoaderEthBalances.svelte';
import { loadErc20Balances, loadEthBalances } from '$eth/services/eth-balance.services';
import type { Erc20Token } from '$eth/types/erc20';
import { enabledErc20Tokens } from '$lib/derived/tokens.derived';
import { syncBalancesFromCache } from '$lib/services/listener.services';
import { ethAddressStore } from '$lib/stores/address.store';
import type { Token } from '$lib/types/token';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { createMockErc20Tokens } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

vi.mock('$eth/services/eth-balance.services', () => ({
	loadEthBalances: vi.fn(),
	loadErc20Balances: vi.fn()
}));

vi.mock('$lib/services/listener.services', () => ({
	syncBalancesFromCache: vi.fn()
}));

describe('LoaderEthBalances', () => {
	const mockErc20DefaultTokens: Erc20Token[] = createMockErc20Tokens({
		n: 3,
		networkEnv: 'testnet'
	});

	const allTokens: Token[] = [...SUPPORTED_ETHEREUM_TOKENS, ...SUPPORTED_EVM_TOKENS];

	const mainnetTokens: Token[] = allTokens.filter(({ network: { env } }) => env === 'mainnet');

	beforeEach(() => {
		vi.clearAllMocks();

		vi.useFakeTimers();

		mockAuthStore();

		setupTestnetsStore('disabled');
		setupUserNetworksStore('allEnabled');

		ethAddressStore.set({ data: mockEthAddress, certified: false });

		vi.spyOn(enabledErc20Tokens, 'subscribe').mockImplementation((fn) => {
			fn(mockErc20DefaultTokens);
			return () => {};
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should sync balances from the cache on mount', async () => {
		render(LoaderEthBalances);

		await tick();

		expect(syncBalancesFromCache).toHaveBeenCalledTimes(
			mainnetTokens.length + mockErc20DefaultTokens.length
		);

		[...mainnetTokens, ...mockErc20DefaultTokens].forEach(
			({ id: tokenId, network: { id: networkId } }, index) => {
				expect(syncBalancesFromCache).toHaveBeenNthCalledWith(index + 1, {
					principal: mockIdentity.getPrincipal(),
					tokenId,
					networkId
				});
			}
		);
	});

	it('should not sync balances from the cache on mount if not logged in', async () => {
		mockAuthStore(null);

		render(LoaderEthBalances);

		await tick();

		expect(syncBalancesFromCache).not.toHaveBeenCalled();
	});

	it('should not throw if syncing balances from cache fails', async () => {
		vi.mocked(syncBalancesFromCache).mockRejectedValueOnce(new Error('Error syncing balances'));

		render(LoaderEthBalances);

		await tick();

		expect(syncBalancesFromCache).toHaveBeenCalledTimes(
			mainnetTokens.length + mockErc20DefaultTokens.length
		);
	});

	it('should call `loadEthBalances` on mount', async () => {
		render(LoaderEthBalances);

		await tick();

		expect(loadEthBalances).toHaveBeenCalledOnce();
		expect(loadEthBalances).toHaveBeenNthCalledWith(1, mainnetTokens);
	});

	it('should call `loadEthBalances` on mount for testnet', async () => {
		setupTestnetsStore('enabled');

		render(LoaderEthBalances);

		await tick();

		expect(loadEthBalances).toHaveBeenCalledOnce();
		expect(loadEthBalances).toHaveBeenNthCalledWith(1, allTokens);
	});

	it('should call `loadErc20Balances` on mount', async () => {
		render(LoaderEthBalances);

		await tick();

		expect(loadErc20Balances).toHaveBeenCalledOnce();
		expect(loadErc20Balances).toHaveBeenNthCalledWith(1, {
			address: mockEthAddress,
			erc20Tokens: mockErc20DefaultTokens
		});
	});

	it('should not load balances if no address is set', async () => {
		ethAddressStore.reset();

		render(LoaderEthBalances);

		await vi.advanceTimersByTimeAsync(1000);

		expect(loadEthBalances).not.toHaveBeenCalled();
		expect(loadErc20Balances).not.toHaveBeenCalled();
	});

	it('should re-trigger loading balances when address changes', async () => {
		vi.stubGlobal(
			'setInterval',
			vi.fn(() => 123456789)
		);

		render(LoaderEthBalances);

		await tick();

		expect(loadEthBalances).toHaveBeenCalledOnce();
		expect(loadEthBalances).toHaveBeenNthCalledWith(1, mainnetTokens);

		expect(loadErc20Balances).toHaveBeenCalledOnce();
		expect(loadErc20Balances).toHaveBeenNthCalledWith(1, {
			address: mockEthAddress,
			erc20Tokens: mockErc20DefaultTokens
		});

		ethAddressStore.set({ data: mockEthAddress2, certified: false });

		await vi.advanceTimersByTimeAsync(1000);

		expect(loadEthBalances).toHaveBeenCalledTimes(2);
		expect(loadEthBalances).toHaveBeenNthCalledWith(2, mainnetTokens);

		expect(loadErc20Balances).toHaveBeenCalledTimes(2);
		expect(loadErc20Balances).toHaveBeenNthCalledWith(2, {
			address: mockEthAddress2,
			erc20Tokens: mockErc20DefaultTokens
		});

		vi.unstubAllGlobals();
	});

	it('should not handle errors', async () => {
		vi.mocked(loadEthBalances).mockRejectedValue(new Error('Error loading balances'));

		const testId = 'test-id';

		const { getByTestId } = render(LoaderEthBalances, {
			props: {
				children: createMockSnippet(testId)
			}
		});

		await tick();

		expect(getByTestId(testId)).toBeInTheDocument();

		expect(loadEthBalances).toHaveBeenCalledOnce();
		expect(loadEthBalances).toHaveBeenNthCalledWith(1, mainnetTokens);

		expect(loadErc20Balances).toHaveBeenCalledOnce();
		expect(loadErc20Balances).toHaveBeenNthCalledWith(1, {
			address: mockEthAddress,
			erc20Tokens: mockErc20DefaultTokens
		});
	});
});
