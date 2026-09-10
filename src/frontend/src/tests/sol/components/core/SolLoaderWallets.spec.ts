import { DEVNET_USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import * as appConstants from '$lib/constants/app.constants';
import { enabledSplTokens } from '$lib/derived/tokens.derived';
import {
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore
} from '$lib/stores/address.store';
import { parseTokenId } from '$lib/validation/token.validation';
import SolLoaderWallets from '$sol/components/core/SolLoaderWallets.svelte';
import { SolWalletWorker } from '$sol/services/worker.sol-wallet.services';
import type { SplToken } from '$sol/types/spl';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { render } from '@testing-library/svelte';
import type { Writable } from 'svelte/store';
import { mock } from 'vitest-mock-extended';

vi.mock(import('$lib/derived/tokens.derived'), async (importOriginal) => {
	const { writable } = await import('svelte/store');

	return {
		...(await importOriginal()),
		enabledSplTokens: writable([])
	};
});

describe('SolLoaderWallets', () => {
	const splTokensStore = enabledSplTokens as Writable<SplToken[]>;

	const splToken2: SplToken = {
		...mockValidSplToken,
		id: parseTokenId('SplTokenId2'),
		address: mockSolAddress2
	};

	let workers: SolWalletWorker[];

	// Workers are managed after a debounce, then initialised asynchronously.
	const settle = () => vi.advanceTimersByTimeAsync(1000);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		solAddressLocalnetStore.reset();
		solAddressDevnetStore.reset();
		solAddressMainnetStore.reset();

		splTokensStore.set([]);

		setupTestnetsStore('enabled');
		setupUserNetworksStore('allEnabled');

		vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => false);

		workers = [];

		vi.spyOn(SolWalletWorker, 'init').mockImplementation(({ token, splTokens }) => {
			const worker = mock<SolWalletWorker>({
				tokenIds: [token.id, ...splTokens.map(({ id }) => id)]
			});

			workers.push(worker);

			return Promise.resolve(worker);
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should not start a worker when no address is available', async () => {
		render(SolLoaderWallets);

		await settle();

		expect(SolWalletWorker.init).not.toHaveBeenCalled();
	});

	it('should start one worker per network with an address, with the SPL tokens of that network', async () => {
		solAddressMainnetStore.set({ data: mockSolAddress, certified: true });
		solAddressDevnetStore.set({ data: mockSolAddress, certified: true });
		splTokensStore.set([mockValidSplToken, splToken2, DEVNET_USDC_TOKEN]);

		render(SolLoaderWallets);

		await settle();

		expect(SolWalletWorker.init).toHaveBeenCalledTimes(2);
		expect(SolWalletWorker.init).toHaveBeenCalledWith({
			token: SOLANA_TOKEN,
			splTokens: [mockValidSplToken, splToken2],
			cachedTokenIds: new Set()
		});
		expect(SolWalletWorker.init).toHaveBeenCalledWith({
			token: SOLANA_DEVNET_TOKEN,
			splTokens: [DEVNET_USDC_TOKEN],
			cachedTokenIds: new Set()
		});

		workers.forEach((worker) => expect(worker.start).toHaveBeenCalledOnce());
	});

	it('should restart the worker of a network when its token list changes', async () => {
		solAddressMainnetStore.set({ data: mockSolAddress, certified: true });
		splTokensStore.set([mockValidSplToken]);

		render(SolLoaderWallets);

		await settle();

		splTokensStore.set([mockValidSplToken, splToken2]);

		await settle();

		expect(SolWalletWorker.init).toHaveBeenCalledTimes(2);
		expect(workers[0].destroy).toHaveBeenCalledOnce();
		expect(SolWalletWorker.init).toHaveBeenLastCalledWith({
			token: SOLANA_TOKEN,
			splTokens: [mockValidSplToken, splToken2],
			cachedTokenIds: new Set([SOLANA_TOKEN.id, mockValidSplToken.id])
		});
		expect(workers[1].start).toHaveBeenCalledOnce();
	});

	it('should restart the worker of a network when its address changes', async () => {
		solAddressMainnetStore.set({ data: mockSolAddress, certified: true });

		render(SolLoaderWallets);

		await settle();

		solAddressMainnetStore.set({ data: mockSolAddress2, certified: true });

		await settle();

		expect(SolWalletWorker.init).toHaveBeenCalledTimes(2);
		expect(workers[0].destroy).toHaveBeenCalledOnce();
		expect(workers[1].start).toHaveBeenCalledOnce();
	});

	it('should keep the worker when the token list comes back the same', async () => {
		solAddressMainnetStore.set({ data: mockSolAddress, certified: true });
		splTokensStore.set([mockValidSplToken]);

		render(SolLoaderWallets);

		await settle();

		splTokensStore.set([{ ...mockValidSplToken }]);

		await settle();

		expect(SolWalletWorker.init).toHaveBeenCalledOnce();
		expect(workers[0].destroy).not.toHaveBeenCalled();
	});

	it('should only restart the network whose token list changed', async () => {
		solAddressMainnetStore.set({ data: mockSolAddress, certified: true });
		solAddressDevnetStore.set({ data: mockSolAddress, certified: true });
		splTokensStore.set([mockValidSplToken]);

		render(SolLoaderWallets);

		await settle();

		splTokensStore.set([mockValidSplToken, DEVNET_USDC_TOKEN]);

		await settle();

		expect(SolWalletWorker.init).toHaveBeenCalledTimes(3);
		expect(SolWalletWorker.init).toHaveBeenLastCalledWith({
			token: SOLANA_DEVNET_TOKEN,
			splTokens: [DEVNET_USDC_TOKEN],
			cachedTokenIds: new Set([SOLANA_DEVNET_TOKEN.id])
		});

		const [mainnetWorker, devnetWorker] = workers;

		expect(mainnetWorker.destroy).not.toHaveBeenCalled();
		expect(devnetWorker.destroy).toHaveBeenCalledOnce();
	});

	it('should destroy the worker of a network that loses its address', async () => {
		solAddressMainnetStore.set({ data: mockSolAddress, certified: true });

		render(SolLoaderWallets);

		await settle();

		solAddressMainnetStore.reset();

		await settle();

		expect(workers[0].destroy).toHaveBeenCalledOnce();
		expect(SolWalletWorker.init).toHaveBeenCalledOnce();
	});

	it('should destroy every worker on unmount', async () => {
		solAddressMainnetStore.set({ data: mockSolAddress, certified: true });
		solAddressDevnetStore.set({ data: mockSolAddress, certified: true });

		const { unmount } = render(SolLoaderWallets);

		await settle();

		unmount();

		expect(workers).toHaveLength(2);

		workers.forEach((worker) => expect(worker.destroy).toHaveBeenCalledOnce());
	});

	it('should trigger every worker on oisyTriggerWallet', async () => {
		solAddressMainnetStore.set({ data: mockSolAddress, certified: true });
		solAddressDevnetStore.set({ data: mockSolAddress, certified: true });

		render(SolLoaderWallets);

		await settle();

		window.dispatchEvent(new CustomEvent('oisyTriggerWallet'));

		await settle();

		workers.forEach((worker) => expect(worker.trigger).toHaveBeenCalledOnce());
	});
});
