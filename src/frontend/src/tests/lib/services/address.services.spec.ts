import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import {
	certifyAddress,
	loadIdbTokenAddress,
	loadTokenAddress,
	type LoadTokenAddressParams
} from '$lib/services/address.services';
import { authStore } from '$lib/stores/auth.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { LoadIdbAddressError } from '$lib/types/errors';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import type { MockInstance } from 'vitest';

describe('address.services', () => {
	const mockGetAddress = vi.fn();
	const mockSetIdbAddress = vi.fn();
	const mockGetIdbAddress = vi.fn();
	const mockUpdateIdbAddressLastUsage = vi.fn();

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
			setIdbAddress: mockSetIdbAddress,
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
			expect(mockGetAddress).toHaveBeenCalledOnce();
			expect(mockGetAddress).toHaveBeenCalledWith(mockIdentity);
			expect(mockAddressStore.set).toHaveBeenCalledWith({ data: 'mock-address', certified: true });
		});

		it('should save the address for future sign-in if setIdbAddress is provided', async () => {
			mockGetAddress.mockResolvedValueOnce('mock-address');

			const result = await loadTokenAddress(mockParams);

			expect(result).toEqual({ success: true });
			expect(mockSetIdbAddress).toHaveBeenCalledOnce();
			expect(mockSetIdbAddress).toHaveBeenCalledWith({
				address: {
					address: 'mock-address',
					createdAtTimestamp: expect.any(Number),
					lastUsedTimestamp: expect.any(Number)
				},
				principal: mockIdentity.getPrincipal()
			});
		});

		it('should reset the address store and show an error if getAddress throws', async () => {
			mockGetAddress.mockRejectedValueOnce(new Error('Failed to get address'));

			const result = await loadTokenAddress(mockParams);

			expect(result).toEqual({ success: false });
			expect(mockAddressStore.reset).toHaveBeenCalledOnce();
			expect(mockSetIdbAddress).not.toHaveBeenCalled();
			expect(spyToastsError).toHaveBeenCalledWith({
				msg: {
					text: replacePlaceholders(en.init.error.loading_address, {
						$symbol: mockNetworkId.description ?? ''
					})
				},
				err: expect.any(Error)
			});
		});
	});

	describe('loadIdbTokenAddress', () => {
		const mockParams = {
			networkId: mockNetworkId,
			getIdbAddress: mockGetIdbAddress,
			updateIdbAddressLastUsage: mockUpdateIdbAddressLastUsage,
			addressStore: mockAddressStore
		};

		it('should return an error if no IDB address is found', async () => {
			mockGetIdbAddress.mockResolvedValueOnce(undefined);

			const result = await loadIdbTokenAddress(mockParams);

			expect(result).toEqual({ success: false, err: new LoadIdbAddressError(mockNetworkId) });
			expect(mockGetIdbAddress).toHaveBeenCalledOnce();
			expect(mockGetIdbAddress).toHaveBeenCalledWith(mockIdentity.getPrincipal());
			expect(mockAddressStore.set).not.toHaveBeenCalled();
			expect(mockUpdateIdbAddressLastUsage).not.toHaveBeenCalled();
		});

		it('should set the address and update last usage on success', async () => {
			const mockAddress = 'test-address';
			mockGetIdbAddress.mockResolvedValueOnce({ address: mockAddress });

			const result = await loadIdbTokenAddress(mockParams);

			expect(result).toEqual({ success: true });
			expect(mockGetIdbAddress).toHaveBeenCalledOnce();
			expect(mockGetIdbAddress).toHaveBeenCalledWith(mockIdentity.getPrincipal());
			expect(mockAddressStore.set).toHaveBeenCalledWith({ data: mockAddress, certified: false });
			expect(mockUpdateIdbAddressLastUsage).toHaveBeenCalledOnce();
			expect(mockUpdateIdbAddressLastUsage).toHaveBeenCalledWith(mockIdentity.getPrincipal());
		});

		it('should handle errors gracefully and return a failure result', async () => {
			mockGetIdbAddress.mockRejectedValueOnce(new Error('Test error'));

			const result = await loadIdbTokenAddress(mockParams);

			expect(result).toEqual({ success: false, err: new LoadIdbAddressError(mockNetworkId) });
			expect(mockGetIdbAddress).toHaveBeenCalledOnce();
			expect(mockGetIdbAddress).toHaveBeenCalledWith(mockIdentity.getPrincipal());
			expect(mockUpdateIdbAddressLastUsage).not.toHaveBeenCalled();
			expect(mockAddressStore.set).not.toHaveBeenCalled();

			expect(console.error).toHaveBeenCalledOnce();
			expect(console.error).toHaveBeenCalledWith(
				`Error encountered while searching for locally stored ${mockNetworkId.description} public address in the browser.`
			);
		});
	});

	describe('certifyAddress', () => {
		const mockParams = {
			networkId: mockNetworkId,
			address: mockAddress,
			getAddress: mockGetAddress,
			updateIdbAddressLastUsage: mockUpdateIdbAddressLastUsage,
			addressStore: mockAddressStore
		};

		beforeEach(() => {});

		it('should return success when address matches and is certified', async () => {
			mockGetAddress.mockResolvedValueOnce(mockAddress);

			const result = await certifyAddress(mockParams);

			expect(result).toEqual({ success: true });
			expect(mockGetAddress).toHaveBeenCalledOnce();
			expect(mockGetAddress).toHaveBeenCalledWith(mockIdentity);
			expect(mockAddressStore.set).toHaveBeenCalledWith({
				data: mockAddress,
				certified: true
			});
			expect(mockUpdateIdbAddressLastUsage).toHaveBeenCalledOnce();
			expect(mockUpdateIdbAddressLastUsage).toHaveBeenCalledWith(mockIdentity.getPrincipal());
		});

		it('should return error when address does not match certified address', async () => {
			mockGetAddress.mockResolvedValueOnce('another-address');

			const result = await certifyAddress(mockParams);

			expect(result).toEqual({
				success: false,
				err: `The address used to load the data did not match your actual ${mockNetworkId.description} wallet address, which is why your session was ended. Please sign in again to reload your own data.`
			});
			expect(mockGetAddress).toHaveBeenCalledOnce();
			expect(mockGetAddress).toHaveBeenCalledWith(mockIdentity);
		});

		it('should reset address store and return error when exception occurs', async () => {
			mockGetAddress.mockRejectedValueOnce(new Error('Unexpected error'));

			const result = await certifyAddress(mockParams);

			expect(result).toEqual({
				success: false,
				err: `Error while loading the ${mockNetworkId.description} address.`
			});
			expect(mockGetAddress).toHaveBeenCalledOnce();
			expect(mockGetAddress).toHaveBeenCalledWith(mockIdentity);
			expect(mockAddressStore.reset).toHaveBeenCalled();
		});
	});
});
