import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { loadTokenAddress, type LoadTokenAddressParams } from '$lib/services/address.services';
import { authStore } from '$lib/stores/auth.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import type { MockInstance } from 'vitest';

describe('address.services', () => {
	const mockGetAddress = vi.fn();

	const mockNetworkId = ETHEREUM_NETWORK_ID;

	const mockAddressStore = {
		set: vi.fn(),
		reset: vi.fn(),
		subscribe: vi.fn()
	};

	const mockIdentity = Ed25519KeyIdentity.generate();

	beforeEach(() => {
		vi.clearAllMocks();

		authStore.setForTesting(mockIdentity);
	});

	describe('loadTokenAddress', () => {
		const mockParams: LoadTokenAddressParams<string> = {
			networkId: mockNetworkId,
			getAddress: mockGetAddress,
			addressStore: mockAddressStore
		};

		let spyToastsError: MockInstance;

		beforeEach(() => {
			spyToastsError = vi.spyOn(toastsStore, 'toastsError');
		});

		it('should load the token address and update the address store', async () => {
			mockGetAddress.mockResolvedValueOnce('mock-address');

			const result = await loadTokenAddress(mockParams);

			expect(result).toEqual({ success: true });
			expect(mockGetAddress).toHaveBeenCalledExactlyOnceWith(mockIdentity);
			expect(mockAddressStore.set).toHaveBeenCalledWith({ data: 'mock-address', certified: true });
		});

		it('should reset the address store and show an error if getAddress throws', async () => {
			mockGetAddress.mockRejectedValueOnce(new Error('Failed to get address'));

			const result = await loadTokenAddress(mockParams);

			expect(result).toEqual({ success: false });
			expect(mockAddressStore.reset).toHaveBeenCalledOnce();
			expect(spyToastsError).toHaveBeenCalledWith({
				msg: {
					text: replacePlaceholders(en.init.error.loading_address, {
						$symbol: `${mockNetworkId.description}`
					})
				},
				err: expect.any(Error)
			});
		});
	});
});
