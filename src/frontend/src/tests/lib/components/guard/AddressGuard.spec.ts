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
import { userProfileStore } from '$lib/stores/user-profile.store';
import { emit } from '$lib/utils/events.utils';
import * as solAddressServices from '$sol/services/sol-address.services';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import {
	mockNetworksSettings,
	mockUserProfile,
	mockUserSettings
} from '$tests/mocks/user-profile.mock';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { toNullable } from '@dfinity/utils';
import { render, waitFor } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

describe('AddressGuard', () => {
	let apiMock: MockInstance;

	const mockSnippet = createMockSnippet('Mock Snippet');

	beforeEach(() => {
		vi.restoreAllMocks();

		vi.clearAllMocks();

		vi.resetAllMocks();

		setupUserNetworksStore('allEnabled');

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

			render(AddressGuard, { children: mockSnippet });

			emit({ message: 'oisyValidateAddresses' });

			expect(spy).toHaveBeenCalledOnce();
		});

		it('should sign out and ultimately reload the window if signer allowance fails', async () => {
			apiMock.mockImplementation(() => {
				throw new CanisterInternalError('Test');
			});

			// Providing a custom IDB storage to AuthClient.create raises a console warning (purely informational).
			// TODO: Remove this when icp-js-core supports an opt-out of that warning.
			vi.spyOn(console, 'warn').mockImplementation(() => {});

			const spySignOut = vi.spyOn(authServices, 'errorSignOut');

			const spy = vi.spyOn(window.location, 'reload');

			render(AddressGuard, { children: mockSnippet });

			emit({ message: 'oisyValidateAddresses' });

			await waitFor(() => {
				expect(spySignOut).toHaveBeenCalledOnce();
				expect(spy).toHaveBeenCalledOnce();
			});

			expect(console.warn).toHaveBeenCalledExactlyOnceWith(
				"You are using a custom storage provider that may not support CryptoKey storage. If you are using a custom storage provider that does not support CryptoKey storage, you should use 'Ed25519' as the key type, as it can serialize to a string"
			);
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
					render(AddressGuard, { children: mockSnippet });

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

			it('should not validate addresses if all networks are disabled', () => {
				setupUserNetworksStore('allDisabled');

				render(AddressGuard, { children: mockSnippet });

				emit({ message: 'oisyValidateAddresses' });

				cases.forEach(({ spy }) => {
					const validateSpy = spy();

					expect(validateSpy).not.toHaveBeenCalled();
				});
			});

			it('should validate addresses only for the enabled networks', async () => {
				userProfileStore.set({
					certified: false,
					profile: {
						...mockUserProfile,
						settings: toNullable({
							...mockUserSettings,
							networks: {
								...mockNetworksSettings,
								testnets: { show_testnets: true },
								networks: [
									[{ BitcoinMainnet: null }, { enabled: false, is_testnet: false }],
									[{ EthereumMainnet: null }, { enabled: false, is_testnet: false }],
									[{ BaseMainnet: null }, { enabled: false, is_testnet: false }],
									[{ BscMainnet: null }, { enabled: false, is_testnet: false }],
									[{ PolygonMainnet: null }, { enabled: false, is_testnet: false }],
									[{ ArbitrumMainnet: null }, { enabled: false, is_testnet: false }],
									[{ SolanaMainnet: null }, { enabled: true, is_testnet: false }]
								]
							}
						})
					}
				});

				render(AddressGuard, { children: mockSnippet });

				const validateBitcoinSpy = vi.spyOn(btcAddressServices, 'validateBtcAddressMainnet');
				const validateEthereumSpy = vi.spyOn(ethAddressServices, 'validateEthAddress');
				const validateSolanaSpy = vi.spyOn(solAddressServices, 'validateSolAddressMainnet');

				emit({ message: 'oisyValidateAddresses' });

				await waitFor(() => {
					expect(validateBitcoinSpy).not.toHaveBeenCalled();
					expect(validateEthereumSpy).not.toHaveBeenCalled();
					expect(validateSolanaSpy).toHaveBeenCalledOnce();
				});
			});

			it('should validate Ethereum address if even only one EVM network is enabled', async () => {
				userProfileStore.set({
					certified: false,
					profile: {
						...mockUserProfile,
						settings: toNullable({
							...mockUserSettings,
							networks: {
								...mockNetworksSettings,
								testnets: { show_testnets: true },
								networks: [
									[{ EthereumMainnet: null }, { enabled: false, is_testnet: false }],
									[{ BaseMainnet: null }, { enabled: true, is_testnet: false }],
									[{ BscMainnet: null }, { enabled: false, is_testnet: false }]
								]
							}
						})
					}
				});

				render(AddressGuard, { children: mockSnippet });

				const validateEthereumSpy = vi.spyOn(ethAddressServices, 'validateEthAddress');

				emit({ message: 'oisyValidateAddresses' });

				await waitFor(() => {
					expect(validateEthereumSpy).toHaveBeenCalled();
				});
			});

			it.each(cases)(
				'should call validate $name address if signer allowance is loaded after address store',
				async ({ store, mockAddress, spy }) => {
					render(AddressGuard, { children: mockSnippet });

					const validateSpy = spy();

					store.set({
						data: mockAddress,
						certified: true
					});

					emit({ message: 'oisyValidateAddresses' });

					await waitFor(() => {
						expect(validateSpy).toHaveBeenCalled();
					});
				}
			);

			it.each(cases)(
				'should call validate $name address if signer allowance is loaded before address store',
				async ({ store, mockAddress, spy }) => {
					render(AddressGuard, { children: mockSnippet });

					const validateSpy = spy();

					emit({ message: 'oisyValidateAddresses' });

					store.set({
						data: mockAddress,
						certified: true
					});

					await waitFor(() => {
						expect(validateSpy).toHaveBeenCalled();
					});
				}
			);

			it.each(cases)(
				'should call validate $name address twice',
				async ({ store, mockAddress, spy }) => {
					render(AddressGuard, { children: mockSnippet });

					const validateSpy = spy();

					emit({ message: 'oisyValidateAddresses' });

					store.set({
						data: mockAddress,
						certified: true
					});

					await waitFor(() => {
						expect(validateSpy).toHaveBeenCalledOnce();
					});

					emit({ message: 'oisyValidateAddresses' });

					await waitFor(() => {
						expect(validateSpy).toHaveBeenCalledTimes(2);
					});
				}
			);
		});
	});
});
