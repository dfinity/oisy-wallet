import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import LoaderEthBalances from '$eth/components/loaders/LoaderEthBalances.svelte';
import { loadErc20Balances, loadEthBalances } from '$eth/services/eth-balance.services';
import type { Erc20Token } from '$eth/types/erc20';
import { enabledErc20Tokens } from '$lib/derived/tokens.derived';
import { ethAddressStore } from '$lib/stores/address.store';
import { createMockErc20Tokens } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { render } from '@testing-library/svelte';

vi.mock('$eth/services/eth-balance.services', () => ({
	loadEthBalances: vi.fn(),
	loadErc20Balances: vi.fn()
}));

describe('LoaderEthBalances', () => {
	const mockErc20DefaultTokens: Erc20Token[] = createMockErc20Tokens({
		n: 3,
		networkEnv: 'testnet'
	});

	beforeEach(() => {
		vi.clearAllMocks();

		vi.useFakeTimers();

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

	it('should call `loadEthBalances` on mount', async () => {
		render(LoaderEthBalances);

		await vi.advanceTimersByTimeAsync(1000);

		expect(loadEthBalances).toHaveBeenCalledOnce();
		expect(loadEthBalances).toHaveBeenNthCalledWith(1, [ETHEREUM_TOKEN]);
	});

	it('should call `loadEthBalances` on mount for testnet', async () => {
		setupTestnetsStore('enabled');

		render(LoaderEthBalances);

		await vi.advanceTimersByTimeAsync(1000);

		expect(loadEthBalances).toHaveBeenCalledOnce();
		expect(loadEthBalances).toHaveBeenNthCalledWith(1, [ETHEREUM_TOKEN, SEPOLIA_TOKEN]);
	});

	it('should call `loadErc20Balances` on mount', async () => {
		render(LoaderEthBalances);

		await vi.advanceTimersByTimeAsync(1000);

		expect(loadErc20Balances).toHaveBeenCalledOnce();
		expect(loadErc20Balances).toHaveBeenNthCalledWith(1, {
			address: mockEthAddress,
			erc20Tokens: mockErc20DefaultTokens
		});
	});

	// TODO: modify the component to be Svelte v5 and check if the children are rendered
	it('should not handle errors', async () => {
		vi.mocked(loadEthBalances).mockRejectedValue(new Error('Error loading balances'));

		render(LoaderEthBalances);

		await vi.advanceTimersByTimeAsync(1000);

		expect(loadEthBalances).toHaveBeenCalledOnce();
		expect(loadEthBalances).toHaveBeenNthCalledWith(1, [ETHEREUM_TOKEN]);

		expect(loadErc20Balances).toHaveBeenCalledOnce();
		expect(loadErc20Balances).toHaveBeenNthCalledWith(1, {
			address: mockEthAddress,
			erc20Tokens: mockErc20DefaultTokens
		});
	});
});
