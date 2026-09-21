import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import XrpLoaderWallets from '$xrp/components/core/XrpLoaderWallets.svelte';
import { enabledXrpTokens } from '$xrp/derived/tokens.derived';
import { XrpWalletWorker } from '$xrp/services/worker.xrp-wallet.services';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { mock } from 'vitest-mock-extended';

describe('XrpLoaderWallets', () => {
	let workers: XrpWalletWorker[];

	// Workers are managed after a debounce, then initialised asynchronously.
	const settle = () => vi.advanceTimersByTimeAsync(1000);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		xrpAddressMainnetStore.reset();

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

	// XRP is enabled from this phase on, so the real enabled-tokens derived is exercised
	// here rather than a mocked one.
	it('should enable the native XRP token', () => {
		expect(get(enabledXrpTokens)).toEqual([XRP_TOKEN]);
	});

	it('should initialize the worker with XRP_TOKEN once the address is available', async () => {
		xrpAddressMainnetStore.set({ data: mockXrpAddress, certified: true });

		render(XrpLoaderWallets);

		await settle();

		expect(XrpWalletWorker.init).toHaveBeenCalledExactlyOnceWith({ token: XRP_TOKEN });

		workers.forEach((worker) => expect(worker.start).toHaveBeenCalledOnce());
	});

	it('should not initialize a worker before an address is available', async () => {
		render(XrpLoaderWallets);

		await settle();

		expect(XrpWalletWorker.init).not.toHaveBeenCalled();
	});
});
