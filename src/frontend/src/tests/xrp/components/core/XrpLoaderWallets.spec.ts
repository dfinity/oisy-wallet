import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import XrpLoaderWallets from '$xrp/components/core/XrpLoaderWallets.svelte';
import { enabledXrpTokens } from '$xrp/derived/tokens.derived';
import { XrpWalletWorker } from '$xrp/services/worker.xrp-wallet.services';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('XrpLoaderWallets', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		xrpAddressMainnetStore.reset();

		setupTestnetsStore('enabled');
		setupUserNetworksStore('allEnabled');

		vi.spyOn(XrpWalletWorker, 'init');
	});

	it('enables the native XRP token', () => {
		expect(get(enabledXrpTokens)).toEqual([XRP_TOKEN]);
	});

	it('initializes a wallet worker once the address is available', async () => {
		xrpAddressMainnetStore.set({ data: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD', certified: true });

		render(XrpLoaderWallets);

		await vi.waitFor(() => {
			expect(XrpWalletWorker.init).toHaveBeenCalledWith({ token: XRP_TOKEN });
		});
	});

	it('does not initialize a wallet worker before an address is available', () => {
		render(XrpLoaderWallets);

		expect(XrpWalletWorker.init).not.toHaveBeenCalled();
	});
});
