import { ckSolConversionAddresses } from '$icp/derived/cksol.derived';
import { ckSolDepositAddressesStore, ckSolMinterAddressStore } from '$icp/stores/cksol.store';
import { authStore } from '$lib/stores/auth.store';
import { mockIdentity, mockPrincipal2 } from '$tests/mocks/identity.mock';
import { mockSolAddress, mockSolAddress2, mockSolAddress3 } from '$tests/mocks/sol.mock';
import { get } from 'svelte/store';

describe('cksol.derived', () => {
	describe('ckSolConversionAddresses', () => {
		beforeEach(() => {
			authStore.setForTesting(mockIdentity);

			ckSolMinterAddressStore.set(undefined);
			ckSolDepositAddressesStore.set({});
		});

		it('should be empty before the addresses are loaded', () => {
			expect(get(ckSolConversionAddresses)).toStrictEqual({
				minterAddress: undefined,
				depositAddress: undefined
			});
		});

		it('should take the deposit address of the signed-in principal only', () => {
			ckSolMinterAddressStore.set(mockSolAddress3);
			ckSolDepositAddressesStore.set({
				[mockPrincipal2.toText()]: mockSolAddress2,
				[mockIdentity.getPrincipal().toText()]: mockSolAddress
			});

			expect(get(ckSolConversionAddresses)).toStrictEqual({
				minterAddress: mockSolAddress3,
				depositAddress: mockSolAddress
			});
		});

		it('should take no deposit address loaded for another principal', () => {
			ckSolDepositAddressesStore.set({ [mockPrincipal2.toText()]: mockSolAddress2 });

			expect(get(ckSolConversionAddresses).depositAddress).toBeUndefined();
		});
	});
});
