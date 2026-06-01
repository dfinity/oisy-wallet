import * as addressEnv from '$env/address.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import * as signerConstants from '$lib/constants/signer.constants';
import {
	deriveTokenAddress,
	loadTokenAddress,
	type LoadTokenAddressParams
} from '$lib/services/address.services';
import { authStore } from '$lib/stores/auth.store';
import * as toastsStore from '$lib/stores/toasts.store';
import type { SignerMasterPubKeys } from '$lib/types/signer';
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

	describe('deriveTokenAddress', () => {
		const mockMasterPubKey = {
			ecdsa: { secp256k1: { pubkey: 'ecdsa-pubkey' } },
			schnorr: { ed25519: { pubkey: 'schnorr-pubkey' } }
		} as unknown as NonNullable<SignerMasterPubKeys['key_1']>;

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
