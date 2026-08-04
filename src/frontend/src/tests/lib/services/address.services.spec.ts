import * as addressEnv from '$env/address.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import * as signerConstants from '$lib/constants/signer.constants';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_ERROR_CODES,
	PLAUSIBLE_EVENT_ERROR_SEVERITIES,
	PLAUSIBLE_EVENT_ERROR_SUBCODES
} from '$lib/enums/plausible';
import {
	deriveTokenAddress,
	loadTokenAddress,
	type LoadTokenAddressParams
} from '$lib/services/address.services';
import * as analyticsServices from '$lib/services/analytics.services';
import { authStore } from '$lib/stores/auth.store';
import { failedAddresses } from '$lib/stores/failed-addresses.store';
import * as toastsStore from '$lib/stores/toasts.store';
import type { SignerMasterPubKeys } from '$lib/types/signer';
import en from '$tests/mocks/i18n.mock';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { get } from 'svelte/store';
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

	let trackAppErrorSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();

		failedAddresses.reset();
		authStore.setForTesting(mockIdentity);

		trackAppErrorSpy = vi.spyOn(analyticsServices, 'trackAppError').mockImplementation(() => {});
	});

	describe('deriveTokenAddress', () => {
		const mockMasterPubKey: NonNullable<SignerMasterPubKeys['key_1']> = {
			ecdsa: { secp256k1: { pubkey: 'ecdsa-pubkey' } },
			schnorr: { ed25519: { pubkey: 'schnorr-pubkey' } }
		};

		const mockDeriveAddress = vi.fn();
		const mockGetSignerAddress = vi.fn();

		beforeEach(() => {
			vi.spyOn(addressEnv, 'FRONTEND_DERIVATION_ENABLED', 'get').mockReturnValue(true);
			vi.spyOn(signerConstants, 'SIGNER_MASTER_PUB_KEY', 'get').mockReturnValue(mockMasterPubKey);
		});

		it('should derive the address on the frontend when enabled and the master key is known', async () => {
			mockDeriveAddress.mockReturnValue('derived-address');

			const result = await deriveTokenAddress<string>({
				identity: mockIdentity,
				deriveAddress: mockDeriveAddress,
				getSignerAddress: mockGetSignerAddress
			});

			expect(result).toBe('derived-address');
			expect(mockDeriveAddress).toHaveBeenCalledExactlyOnceWith({
				user: mockIdentity.getPrincipal().toString(),
				masterPubKey: mockMasterPubKey
			});
			expect(mockGetSignerAddress).not.toHaveBeenCalled();
		});

		it('should fall back to the signer API when frontend derivation is disabled', async () => {
			vi.spyOn(addressEnv, 'FRONTEND_DERIVATION_ENABLED', 'get').mockReturnValue(false);
			mockGetSignerAddress.mockResolvedValue('signer-address');

			const result = await deriveTokenAddress<string>({
				identity: mockIdentity,
				deriveAddress: mockDeriveAddress,
				getSignerAddress: mockGetSignerAddress
			});

			expect(result).toBe('signer-address');
			expect(mockGetSignerAddress).toHaveBeenCalledOnce();
			expect(mockDeriveAddress).not.toHaveBeenCalled();
		});

		it('should fall back to the signer API when the master key is unknown', async () => {
			vi.spyOn(signerConstants, 'SIGNER_MASTER_PUB_KEY', 'get').mockReturnValue(undefined);
			mockGetSignerAddress.mockResolvedValue('signer-address');

			const result = await deriveTokenAddress<string>({
				identity: mockIdentity,
				deriveAddress: mockDeriveAddress,
				getSignerAddress: mockGetSignerAddress
			});

			expect(result).toBe('signer-address');
			expect(mockGetSignerAddress).toHaveBeenCalledOnce();
			expect(mockDeriveAddress).not.toHaveBeenCalled();
		});

		it('should throw when frontend derivation is enabled but the identity is nullish', async () => {
			await expect(
				deriveTokenAddress<string>({
					identity: null,
					deriveAddress: mockDeriveAddress,
					getSignerAddress: mockGetSignerAddress
				})
			).rejects.toThrow(en.auth.error.no_internet_identity);

			expect(mockDeriveAddress).not.toHaveBeenCalled();
			expect(mockGetSignerAddress).not.toHaveBeenCalled();
		});
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

		it('should reset the store and report a derivation failure if getAddress throws', async () => {
			mockGetAddress.mockRejectedValueOnce(new Error('Failed to get address'));

			const result = await loadTokenAddress(mockParams);

			expect(result).toEqual({ success: false, err: 'derivation-failed' });
			expect(mockAddressStore.reset).toHaveBeenCalledOnce();
			expect(get(failedAddresses)).toEqual([{ networkId: mockNetworkId, reported: false }]);
		});

		// The toast moved to the aggregating service: with two callers and a retry loop, one toast
		// per chain per attempt is exactly the pile-up this change removes.
		it('should not toast directly', async () => {
			mockGetAddress.mockRejectedValueOnce(new Error('Failed to get address'));

			await loadTokenAddress(mockParams);

			expect(spyToastsError).not.toHaveBeenCalled();
		});

		it('should track a major-severity address derivation failure', async () => {
			mockGetAddress.mockRejectedValueOnce(new Error('Failed to get address'));

			await loadTokenAddress(mockParams);

			expect(trackAppErrorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					context: PLAUSIBLE_EVENT_CONTEXTS.ADDRESS_DERIVATION,
					code: PLAUSIBLE_EVENT_ERROR_CODES.ADDRESS_DERIVATION_FAILED,
					subcode: PLAUSIBLE_EVENT_ERROR_SUBCODES.DERIVE_THREW,
					severity: PLAUSIBLE_EVENT_ERROR_SEVERITIES.MAJOR
				})
			);
		});

		// A lost session is ordinary lifecycle, already covered by the sign-out events. Emitting a
		// fault for it would bury the real signal in routine sign-outs.
		it('should report a session failure without tracking or recording the chain', async () => {
			authStore.setForTesting(null as unknown as typeof mockIdentity);

			const result = await loadTokenAddress(mockParams);

			expect(result).toEqual({ success: false, err: 'session-invalid' });
			expect(mockGetAddress).not.toHaveBeenCalled();
			expect(get(failedAddresses)).toEqual([]);
			expect(trackAppErrorSpy).not.toHaveBeenCalled();
		});

		it('should clear a previously failed chain once its address loads', async () => {
			failedAddresses.add(mockNetworkId);
			mockGetAddress.mockResolvedValueOnce('mock-address');

			await loadTokenAddress(mockParams);

			expect(get(failedAddresses)).toEqual([]);
		});
	});
});
