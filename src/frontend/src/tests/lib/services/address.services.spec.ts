import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import {
	certifyAddress,
	loadTokenAddress,
	type LoadTokenAddressParams
} from '$lib/services/address.services';
import { authStore } from '$lib/stores/auth.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import type { MockInstance } from 'vitest';

describe('address.services', () => {
	const mockGetAddress = vi.fn();

	const mockNetworkId = ETHEREUM_NETWORK_ID;
	const mockAddress = mockEthAddress;

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

	describe('certifyAddress', () => {
		const mockParams = {
			networkId: mockNetworkId,
			address: mockAddress,
			getAddress: mockGetAddress,
			addressStore: mockAddressStore
		};

		beforeEach(() => {});

		it('should return success when address matches and is certified', async () => {
			mockGetAddress.mockResolvedValueOnce(mockAddress);

			const result = await certifyAddress(mockParams);

			expect(result).toEqual({ success: true });
			expect(mockGetAddress).toHaveBeenCalledExactlyOnceWith(mockIdentity);
			expect(mockAddressStore.set).toHaveBeenCalledWith({
				data: mockAddress,
				certified: true
			});
		});

		it('should return error when address does not match certified address', async () => {
			mockGetAddress.mockResolvedValueOnce('another-address');

			const result = await certifyAddress(mockParams);

			expect(result).toEqual({
				success: false,
				err: `The address used to load the data did not match your actual ${mockNetworkId.description} wallet address, which is why your session was ended. Please sign in again to reload your own data.`
			});
			expect(mockGetAddress).toHaveBeenCalledExactlyOnceWith(mockIdentity);
		});

		it('should reset address store and return error when exception occurs', async () => {
			mockGetAddress.mockRejectedValueOnce(new Error('Unexpected error'));

			const result = await certifyAddress(mockParams);

			expect(result).toEqual({
				success: false,
				err: `Error while loading the ${mockNetworkId.description} address.`
			});
			expect(mockGetAddress).toHaveBeenCalledExactlyOnceWith(mockIdentity);
			expect(mockAddressStore.reset).toHaveBeenCalled();
		});
	});
});
