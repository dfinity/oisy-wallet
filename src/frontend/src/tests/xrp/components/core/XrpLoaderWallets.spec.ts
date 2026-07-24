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

	// XRP ships disabled by default (VITE_XRP_MAINNET_ENABLED unset), so no XRP token is
	// enabled and no wallet worker is started — even once an address is available.
	it('does not initialize a wallet worker while XRP is disabled', () => {
		xrpAddressMainnetStore.set({ data: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD', certified: true });

		render(XrpLoaderWallets);

		expect(get(enabledXrpTokens)).toHaveLength(0);
		expect(XrpWalletWorker.init).not.toHaveBeenCalled();
	});
});
