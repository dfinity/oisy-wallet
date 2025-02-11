import * as btcAddressServices from '$btc/services/btc-address.services';
import * as ethAddressServices from '$eth/services/eth-address.services';
import * as api from '$lib/api/backend.api';
import { CanisterInternalError } from '$lib/canisters/errors';
import AddressGuard from '$lib/components/guard/AddressGuard.svelte';
import * as authServices from '$lib/services/auth.services';
import * as loaderServices from '$lib/services/loader.services';
import {
	btcAddressMainnetStore,
	ethAddressStore,
	solAddressMainnetStore
} from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { emit } from '$lib/utils/events.utils';
import * as solAddressServices from '$sol/services/sol-address.services';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

describe('AddressGuard', () => {
	let apiMock: MockInstance;

	beforeEach(() => {
		vi.restoreAllMocks();

		vi.clearAllMocks();

		vi.resetAllMocks();

		apiMock = vi.spyOn(api, 'allowSigning');

		authStore.setForTesting(mockIdentity);

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
			const cases = [
				{
					name: 'eth',
					store: ethAddressStore,
					mockAddress: mockEthAddress,
					validateFn: ethAddressServices.validateEthAddress,
					validateName: 'validateEthAddress'
				},
				{
					name: 'btc',
					store: btcAddressMainnetStore,
					mockAddress: mockBtcAddress,
					validateFn: btcAddressServices.validateBtcAddressMainnet,
					validateName: 'validateBtcAddressMainnet'
				},
				{
					name: 'sol',
					store: solAddressMainnetStore,
					mockAddress: mockSolAddress,
					validateFn: solAddressServices.validateSolAddressMainnet,
					validateName: 'validateSolAddressMainnet'
				}
			] as const;

			it.each(cases)(
				'should not call validate $name address if signer allowance is not loaded',
				({ store, mockAddress, validateFn }) => {
					render(AddressGuard);

					const spy = vi.spyOn({ validateFn }, 'validateFn');

					store.set({
						data: mockAddress,
						certified: true
					});

					expect(spy).not.toHaveBeenCalled();
				}
			);
		});

		describe('Signer allowance loaded', () => {
			beforeEach(() => {
				apiMock.mockResolvedValue(undefined);
			});

			const cases = [
				{
					name: 'eth',
					store: ethAddressStore,
					mockAddress: mockEthAddress,
					spy: () => vi.spyOn(ethAddressServices, 'validateEthAddress')
				},
				{
					name: 'btc',
					store: btcAddressMainnetStore,
					mockAddress: mockBtcAddress,
					spy: () => vi.spyOn(btcAddressServices, 'validateBtcAddressMainnet')
				},
				{
					name: 'sol',
					store: solAddressMainnetStore,
					mockAddress: mockSolAddress,
					spy: () => vi.spyOn(solAddressServices, 'validateSolAddressMainnet')
				}
			] as const;

			it.each(cases)(
				'should call validate $name address if signer allowance is loaded after address store',
				async ({ store, mockAddress, spy }) => {
					render(AddressGuard);

					const validateSpy = spy();

					store.set({
						data: mockAddress,
						certified: true
					});

					emit({ message: 'oisyValidateAddresses' });

					await vi.waitFor(() => {
						expect(validateSpy).toHaveBeenCalled();
					});
				}
			);

			it.each(cases)(
				'should call validate $name address if signer allowance is loaded before address store',
				async ({ store, mockAddress, spy }) => {
					render(AddressGuard);

					const validateSpy = spy();

					emit({ message: 'oisyValidateAddresses' });

					store.set({
						data: mockAddress,
						certified: true
					});

					await vi.waitFor(() => {
						expect(validateSpy).toHaveBeenCalled();
					});
				}
			);

			it.each(cases)(
				'should call validate $name address twice',
				async ({ store, mockAddress, spy }) => {
					render(AddressGuard);

					const validateSpy = spy();

					emit({ message: 'oisyValidateAddresses' });

					store.set({
						data: mockAddress,
						certified: true
					});

					await vi.waitFor(() => {
						expect(validateSpy).toHaveBeenCalledTimes(1);
					});

					emit({ message: 'oisyValidateAddresses' });

					await vi.waitFor(() => {
						expect(validateSpy).toHaveBeenCalledTimes(2);
					});
				}
			);
		});
	});
});
