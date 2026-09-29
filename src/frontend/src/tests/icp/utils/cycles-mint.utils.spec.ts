import { CMC_CANISTER_ID } from '$env/networks/networks.icp.env';
import { CMC_MINT_CYCLES_MEMO } from '$icp/constants/cmc.constants';
import {
	getCyclesMintDepositAccount,
	getCyclesMintDepositAccountIdentifier
} from '$icp/utils/cycles-mint.utils';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { AccountIdentifier, SubAccount } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';

describe('cycles-mint.utils', () => {
	describe('CMC_MINT_CYCLES_MEMO', () => {
		it('should be MINT as an 8-byte little-endian number', () => {
			const view = new DataView(CMC_MINT_CYCLES_MEMO.buffer);

			expect(CMC_MINT_CYCLES_MEMO).toHaveLength(8);
			expect(view.getBigUint64(0, true)).toBe(0x544e494dn);
		});
	});

	describe('getCyclesMintDepositAccount', () => {
		it("should be the CMC's account under the subaccount derived from the principal", () => {
			const { owner, subaccount } = getCyclesMintDepositAccount(mockPrincipal);
			const principalBytes = mockPrincipal.toUint8Array();

			expect(owner.toText()).toBe(CMC_CANISTER_ID);
			expect(subaccount).toHaveLength(32);
			expect(subaccount?.[0]).toBe(principalBytes.length);
			expect(subaccount?.slice(1, 1 + principalBytes.length)).toEqual(principalBytes);
			expect(subaccount?.slice(1 + principalBytes.length).every((byte) => byte === 0)).toBeTruthy();
		});
	});

	describe('getCyclesMintDepositAccountIdentifier', () => {
		it('should name the same account as the ledger derives it from the principal', () => {
			const expected = AccountIdentifier.fromPrincipal({
				principal: Principal.fromText(CMC_CANISTER_ID),
				subAccount: SubAccount.fromPrincipal(mockPrincipal)
			}).toHex();

			expect(getCyclesMintDepositAccountIdentifier(mockPrincipal)).toBe(expected);
		});
	});
});
