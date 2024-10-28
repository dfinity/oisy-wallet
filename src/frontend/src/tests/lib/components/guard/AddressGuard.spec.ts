import * as api from '$lib/api/backend.api';
import { CanisterInternalError } from '$lib/canisters/errors';
import AddressGuard from '$lib/components/guard/AddressGuard.svelte';
import * as addressServices from '$lib/services/address.services';
import * as authServices from '$lib/services/auth.services';
import * as loaderServices from '$lib/services/loader.services';
import { btcAddressMainnetStore, ethAddressStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { emit } from '$lib/utils/events.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { render } from '@testing-library/svelte';
import { expect, type MockInstance } from 'vitest';

describe('AddressGuard', () => {
	let apiMock: MockInstance;

	beforeEach(() => {
		vi.restoreAllMocks();

		vi.clearAllMocks();
		vi.resetAllMocks();

		apiMock = vi.spyOn(api, 'allowSigning');

		const identity = Ed25519KeyIdentity.generate();
		authStore.setForTesting(identity);

		Object.defineProperty(window, 'location', {
			writable: true,
			value: {
				href: 'https://oisy.com',
				reload: vi.fn()
			}
		});

		vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
	});

	describe('Signer allowance', () => {
		it('should load signer allowance on event', () => {
			apiMock.mockResolvedValueOnce(undefined);

			const spy = vi.spyOn(loaderServices, 'initSignerAllowance');

			render(AddressGuard);

			emit({ message: 'oisyValidateAddresses' });

			expect(spy).toHaveBeenCalledOnce();
		});

		it('should sign out and ultimately reload the window if signer allowance fails', async () => {
			apiMock.mockImplementation(() => {
				throw new CanisterInternalError('Test');
			});

			const spySignOut = vi.spyOn(authServices, 'errorSignOut');

			const spy = vi.spyOn(window.location, 'reload');

			render(AddressGuard);

			emit({ message: 'oisyValidateAddresses' });

			await vi.waitFor(() => {
				expect(spySignOut).toHaveBeenCalledOnce();
				expect(spy).toHaveBeenCalledOnce();
			});
		});
	});

	describe('Validate addresses', () => {
		describe('Signer allowance not loaded', () => {
			it('should not call validate eth address if signer allowance is not loaded', () => {
				render(AddressGuard);

				const spy = vi.spyOn(addressServices, 'validateEthAddress');

				ethAddressStore.set({
					data: mockEthAddress,
					certified: true
				});

				expect(spy).not.toHaveBeenCalled();
			});

			it('should not call validate btc address if signer allowance is not loaded', () => {
				render(AddressGuard);

				const spy = vi.spyOn(addressServices, 'validateBtcAddressMainnet');

				btcAddressMainnetStore.set({
					data: mockBtcAddress,
					certified: true
				});

				expect(spy).not.toHaveBeenCalled();
			});
		});

		describe('Signer allowance loaded', () => {
			beforeEach(() => {
				apiMock.mockResolvedValue(undefined);
			});

			it('should call validate eth address if signer allowance is loaded after eth address store', async () => {
				render(AddressGuard);

				const spy = vi.spyOn(addressServices, 'validateEthAddress');

				ethAddressStore.set({
					data: mockEthAddress,
					certified: true
				});

				emit({ message: 'oisyValidateAddresses' });

				await vi.waitFor(() => {
					expect(spy).toHaveBeenCalled();
				});
			});

			it('should call validate eth address if signer allowance is loaded before eth address store', async () => {
				render(AddressGuard);

				const spy = vi.spyOn(addressServices, 'validateEthAddress');

				emit({ message: 'oisyValidateAddresses' });

				ethAddressStore.set({
					data: mockEthAddress,
					certified: true
				});

				await vi.waitFor(() => {
					expect(spy).toHaveBeenCalled();
				});
			});

			it('should call validate eth address twice', async () => {
				render(AddressGuard);

				const spy = vi.spyOn(addressServices, 'validateEthAddress');

				emit({ message: 'oisyValidateAddresses' });

				ethAddressStore.set({
					data: mockEthAddress,
					certified: true
				});

				await vi.waitFor(() => {
					expect(spy).toHaveBeenCalledTimes(1);
				});

				emit({ message: 'oisyValidateAddresses' });

				await vi.waitFor(() => {
					expect(spy).toHaveBeenCalledTimes(2);
				});
			});

			it('should call validate btc address if signer allowance is loaded after eth address store', async () => {
				render(AddressGuard);

				const spy = vi.spyOn(addressServices, 'validateBtcAddressMainnet');

				btcAddressMainnetStore.set({
					data: mockBtcAddress,
					certified: true
				});

				emit({ message: 'oisyValidateAddresses' });

				await vi.waitFor(() => {
					expect(spy).toHaveBeenCalled();
				});
			});

			it('should call validate btc address if signer allowance is loaded before eth address store', async () => {
				render(AddressGuard);

				const spy = vi.spyOn(addressServices, 'validateBtcAddressMainnet');

				btcAddressMainnetStore.set({
					data: mockBtcAddress,
					certified: true
				});

				emit({ message: 'oisyValidateAddresses' });

				await vi.waitFor(() => {
					expect(spy).toHaveBeenCalled();
				});
			});

			it('should call validate btc address twice', async () => {
				render(AddressGuard);

				const spy = vi.spyOn(addressServices, 'validateBtcAddressMainnet');

				emit({ message: 'oisyValidateAddresses' });

				btcAddressMainnetStore.set({
					data: mockBtcAddress,
					certified: true
				});

				await vi.waitFor(() => {
					expect(spy).toHaveBeenCalledTimes(1);
				});

				emit({ message: 'oisyValidateAddresses' });

				await vi.waitFor(() => {
					expect(spy).toHaveBeenCalledTimes(2);
				});
			});
		});
	});
});
