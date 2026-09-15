import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import type { RequiredToken } from '$lib/types/token';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import XrpLoaderWallets from '$xrp/components/core/XrpLoaderWallets.svelte';
import { enabledXrpTokens } from '$xrp/derived/tokens.derived';
import { XrpWalletWorker } from '$xrp/services/worker.xrp-wallet.services';
import { render } from '@testing-library/svelte';
import type { Writable } from 'svelte/store';
import { mock } from 'vitest-mock-extended';

vi.mock(import('$xrp/derived/tokens.derived'), async (importOriginal) => {
	const { writable } = await import('svelte/store');

	return {
		...(await importOriginal()),
		enabledXrpTokens: writable([])
	};
});

describe('XrpLoaderWallets', () => {
	const enabledTokensStore = enabledXrpTokens as Writable<RequiredToken[]>;

	let workers: XrpWalletWorker[];

	// Workers are managed after a debounce, then initialised asynchronously.
	const settle = () => vi.advanceTimersByTimeAsync(1000);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		xrpAddressMainnetStore.reset();
		enabledTokensStore.set([]);

		setupTestnetsStore('enabled');
		setupUserNetworksStore('allEnabled');

		workers = [];

		vi.spyOn(XrpWalletWorker, 'init').mockImplementation(() => {
			const worker = mock<XrpWalletWorker>();

			workers.push(worker);

			return Promise.resolve(worker);
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should not initialize a worker when no XRP token is enabled', async () => {
		xrpAddressMainnetStore.set({ data: mockXrpAddress, certified: true });

		render(XrpLoaderWallets);

		await settle();

		expect(XrpWalletWorker.init).not.toHaveBeenCalled();
	});

	it('should not initialize a worker when no address is available', async () => {
		enabledTokensStore.set([XRP_TOKEN]);

		render(XrpLoaderWallets);

		await settle();

		expect(XrpWalletWorker.init).not.toHaveBeenCalled();
	});

	it('should initialize the worker with XRP_TOKEN when enabled and an address is available', async () => {
		xrpAddressMainnetStore.set({ data: mockXrpAddress, certified: true });
		enabledTokensStore.set([XRP_TOKEN]);

		render(XrpLoaderWallets);

		await settle();

		expect(XrpWalletWorker.init).toHaveBeenCalledExactlyOnceWith({ token: XRP_TOKEN });

		workers.forEach((worker) => expect(worker.start).toHaveBeenCalledOnce());
	});
});
