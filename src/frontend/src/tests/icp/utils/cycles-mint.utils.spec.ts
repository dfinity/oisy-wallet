import { CMC_CANISTER_ID } from '$env/networks/networks.icp.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { CMC_MINT_CYCLES_MEMO } from '$icp/constants/cmc.constants';
import {
	estimateCyclesMintCredited,
	getCyclesMintDepositAccount,
	getCyclesMintDepositAccountIdentifier,
	isCyclesMintAmountTooSmall,
	isTokenCyclesLedger,
	toCyclesPerIcp
} from '$icp/utils/cycles-mint.utils';
import { ZERO } from '$lib/constants/app.constants';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
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

	describe('isTokenCyclesLedger', () => {
		it('is true for the mainnet cycles ledger’s token only', () => {
			expect(isTokenCyclesLedger(mockTcyclesToken)).toBeTruthy();
			expect(isTokenCyclesLedger(mockValidIcrcToken)).toBeFalsy();
			expect(isTokenCyclesLedger(ICP_TOKEN)).toBeFalsy();
			expect(isTokenCyclesLedger(undefined)).toBeFalsy();
		});
	});

	describe('toCyclesPerIcp', () => {
		// 4.5 XDR per ICP: 4.5 TCYCLES, i.e. 4.5 × 10^12 cycles.
		it('converts the CMC rate into cycles per ICP', () => {
			expect(toCyclesPerIcp(45_000n)).toBe(4_500_000_000_000n);
		});
	});

	describe('estimateCyclesMintCredited', () => {
		it('mints e8s × rate cycles and takes off the deposit fee', () => {
			expect(
				estimateCyclesMintCredited({ amount: 100_000_000n, xdrPermyriadPerIcp: 45_000n })
			).toBe(4_499_900_000_000n);
		});

		it('is zero when the deposit fee takes it all', () => {
			expect(estimateCyclesMintCredited({ amount: 1n, xdrPermyriadPerIcp: 45_000n })).toBe(ZERO);
			expect(estimateCyclesMintCredited({ amount: ZERO, xdrPermyriadPerIcp: 45_000n })).toBe(ZERO);
		});
	});

	describe('isCyclesMintAmountTooSmall', () => {
		// A refund returns the amount minus 0.0003 ICP: nothing at all at or below it.
		it('is true at or below 0.0003 ICP, however much that mints', () => {
			expect(
				isCyclesMintAmountTooSmall({ amount: 30_000n, xdrPermyriadPerIcp: 45_000n })
			).toBeTruthy();
			expect(
				isCyclesMintAmountTooSmall({ amount: 30_001n, xdrPermyriadPerIcp: 45_000n })
			).toBeFalsy();
		});

		// At 0.5 TCYCLES per ICP, 0.0004 ICP mints exactly twice the 0.0001 TCYCLES fee.
		it('is true while the amount mints less than twice the deposit fee at the rate', () => {
			expect(
				isCyclesMintAmountTooSmall({ amount: 39_999n, xdrPermyriadPerIcp: 5_000n })
			).toBeTruthy();
			expect(
				isCyclesMintAmountTooSmall({ amount: 40_000n, xdrPermyriadPerIcp: 5_000n })
			).toBeFalsy();
		});

		it('checks only the 0.0003 ICP floor without a rate', () => {
			expect(isCyclesMintAmountTooSmall({ amount: 30_000n })).toBeTruthy();
			expect(isCyclesMintAmountTooSmall({ amount: 30_001n })).toBeFalsy();
		});
	});
});
