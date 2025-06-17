import { SOLANA_KEY_ID, SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import * as idbApi from '$lib/api/idb-addresses.api';
import * as signerApi from '$lib/api/signer.api';
import {
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore
} from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { LoadIdbAddressError } from '$lib/types/errors';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { SOLANA_DERIVATION_PATH_PREFIX } from '$sol/constants/sol.constants';
import {
	getSolAddressDevnet,
	getSolAddressLocal,
	getSolAddressMainnet,
	loadIdbSolAddressMainnet,
	loadSolAddressDevnet,
	loadSolAddressLocal,
	loadSolAddressMainnet,
	validateSolAddressMainnet
} from '$sol/services/sol-address.services';
import { SolanaNetworks } from '$sol/types/network';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { getAddressDecoder } from '@solana/kit';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('@solana/kit', () => ({
	getAddressDecoder: vi.fn()
}));

describe('sol-address.services', () => {
	const mockSolAddress = 'solana123';
	const mockPublicKey = new Uint8Array([1, 2, 3]);

	let spyGetSchnorrPublicKey: MockInstance;
	let spyGetIdbAddress: MockInstance;
	let spyUpdateIdbAddressLastUsage: MockInstance;
	let spyToastsError: MockInstance;
	let mockDecoder: { decode: MockInstance; read: MockInstance };

	beforeEach(() => {
		vi.clearAllMocks();

		authStore.setForTesting(mockIdentity);

		mockDecoder = {
			decode: vi.fn().mockReturnValue(mockSolAddress),
			read: vi.fn().mockReturnValue(mockSolAddress)
		};
		vi.mocked(getAddressDecoder).mockReturnValue(mockDecoder as never);

		spyGetSchnorrPublicKey = vi.spyOn(signerApi, 'getSchnorrPublicKey');
		spyGetIdbAddress = vi.spyOn(idbApi, 'getIdbSolAddressMainnet');
		spyUpdateIdbAddressLastUsage = vi.spyOn(idbApi, 'updateIdbSolAddressMainnetLastUsage');
		spyToastsError = vi.spyOn(toastsStore, 'toastsError');
	});

	describe('Generate Solana Addresses for Different Networks', () => {
		beforeEach(() => {
			spyGetSchnorrPublicKey.mockResolvedValue(mockPublicKey);
		});

		const networkCases = [
			['mainnet', getSolAddressMainnet, SolanaNetworks.mainnet],
			['devnet', getSolAddressDevnet, SolanaNetworks.devnet],
			['local', getSolAddressLocal, SolanaNetworks.local]
		] as const;

		it.each(networkCases)(
			'should generate valid %s address',
			// eslint-disable-next-line local-rules/prefer-object-params
			async (_, getAddress, networkType) => {
				const result = await getAddress(mockIdentity);

				expect(result).toBe(mockSolAddress);
				expect(spyGetSchnorrPublicKey).toHaveBeenCalledWith({
					identity: mockIdentity,
					keyId: SOLANA_KEY_ID,
					derivationPath: [SOLANA_DERIVATION_PATH_PREFIX, networkType]
				});
			}
		);
	});

	describe('Load Solana Addresses into State', () => {
		beforeEach(() => {
			spyGetSchnorrPublicKey.mockResolvedValue(mockPublicKey);
		});

		const loadCases = [
			['mainnet', loadSolAddressMainnet, solAddressMainnetStore],
			['devnet', loadSolAddressDevnet, solAddressDevnetStore],
			['local', loadSolAddressLocal, solAddressLocalnetStore]
		] as const;

		// eslint-disable-next-line local-rules/prefer-object-params
		it.each(loadCases)('should load %s address into store', async (_, loadAddress, store) => {
			const result = await loadAddress();

			expect(result).toEqual({ success: true });
			expect(get(store)).toEqual({
				data: mockSolAddress,
				certified: true
			});
		});

		it('should handle errors during address loading', async () => {
			const error = new Error('Failed to load address');
			spyGetSchnorrPublicKey.mockRejectedValue(error);

			const result = await loadSolAddressMainnet();

			expect(result).toEqual({ success: false });
			expect(spyToastsError).toHaveBeenCalledWith({
				msg: {
					text: replacePlaceholders(en.init.error.loading_address, {
						$symbol: SOLANA_TOKEN_ID.description ?? ''
					})
				},
				err: error
			});
		});
	});

	describe('Load Address from IndexedDB', () => {
		it('should successfully load address from IDB', async () => {
			spyGetIdbAddress.mockResolvedValue({ address: mockSolAddress });

			const result = await loadIdbSolAddressMainnet();

			expect(result).toEqual({ success: true });
			expect(get(solAddressMainnetStore)).toEqual({
				data: mockSolAddress,
				certified: false
			});
			expect(spyUpdateIdbAddressLastUsage).toHaveBeenCalledWith(mockIdentity.getPrincipal());
		});

		it('should handle missing IDB address', async () => {
			spyGetIdbAddress.mockResolvedValue(undefined);

			const result = await loadIdbSolAddressMainnet();

			expect(result).toEqual({
				success: false,
				err: new LoadIdbAddressError(SOLANA_MAINNET_NETWORK_ID)
			});
			expect(spyUpdateIdbAddressLastUsage).not.toHaveBeenCalled();
		});
	});

	describe('Validate and Certify Mainnet Address', () => {
		it('should validate and certify a matching address', async () => {
			spyGetSchnorrPublicKey.mockResolvedValue(mockPublicKey);

			const addressStore = {
				data: mockSolAddress,
				certified: false
			};

			await validateSolAddressMainnet(addressStore);

			expect(get(solAddressMainnetStore)).toEqual({
				data: mockSolAddress,
				certified: true
			});
		});
	});
});
