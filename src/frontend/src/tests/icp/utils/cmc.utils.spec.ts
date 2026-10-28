import { CMC_CANISTER_ID } from '$env/networks/networks.icp.env';
import { CMC_MINT_CYCLES_MEMO } from '$icp/constants/cmc.constants';
import {
	getCmcDepositAccount,
	getCmcDepositAccountIdentifier,
	isCmcDeposit
} from '$icp/utils/cmc.utils';
import { ZERO } from '$lib/constants/app.constants';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { AccountIdentifier, SubAccount, type IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';

const DEPOSIT_ACCOUNT_IDENTIFIER = 'a1b2c3';
const OWN_ACCOUNT_IDENTIFIER = 'd4e5f6';
const AMOUNT = 100_000_000n;
const TRANSFER_CREATED_AT_NS = 1_790_000_000_000_000_000n;

const deposit = ({
	overrides = {},
	transfer = {}
}: {
	overrides?: Partial<IcpIndexDid.Transaction>;
	transfer?: Partial<{ from: string; to: string; e8s: bigint }>;
} = {}): IcpIndexDid.Transaction => ({
	memo: ZERO,
	icrc1_memo: [CMC_MINT_CYCLES_MEMO],
	operation: {
		Transfer: {
			to: transfer.to ?? DEPOSIT_ACCOUNT_IDENTIFIER,
			fee: { e8s: 10_000n },
			from: transfer.from ?? OWN_ACCOUNT_IDENTIFIER,
			amount: { e8s: transfer.e8s ?? AMOUNT },
			spender: []
		}
	},
	timestamp: [{ timestamp_nanos: TRANSFER_CREATED_AT_NS + 1n }],
	created_at_time: [{ timestamp_nanos: TRANSFER_CREATED_AT_NS }],
	...overrides
});

describe('cmc.utils', () => {
	describe('getCmcDepositAccount', () => {
		it("should be the CMC's account under the subaccount derived from the principal", () => {
			const { owner, subaccount } = getCmcDepositAccount(mockPrincipal);
			const principalBytes = mockPrincipal.toUint8Array();

			expect(owner.toText()).toBe(CMC_CANISTER_ID);
			expect(subaccount).toHaveLength(32);
			expect(subaccount?.[0]).toBe(principalBytes.length);
			expect(subaccount?.slice(1, 1 + principalBytes.length)).toEqual(principalBytes);
			expect(subaccount?.slice(1 + principalBytes.length).every((byte) => byte === 0)).toBeTruthy();
		});
	});

	describe('getCmcDepositAccountIdentifier', () => {
		it('should name the same account as the ledger derives it from the principal', () => {
			const expected = AccountIdentifier.fromPrincipal({
				principal: Principal.fromText(CMC_CANISTER_ID),
				subAccount: SubAccount.fromPrincipal(mockPrincipal)
			}).toHex();

			expect(getCmcDepositAccountIdentifier(mockPrincipal)).toBe(expected);
		});
	});

	describe('isCmcDeposit', () => {
		const params = {
			depositAccountIdentifier: DEPOSIT_ACCOUNT_IDENTIFIER,
			ownAccountIdentifier: OWN_ACCOUNT_IDENTIFIER,
			memo: CMC_MINT_CYCLES_MEMO,
			amount: AMOUNT,
			transferCreatedAtNs: TRANSFER_CREATED_AT_NS
		};

		it('matches the deposit', () => {
			expect(isCmcDeposit({ ...params, transaction: deposit() })).toBeTruthy();
		});

		it('compares the accounts in any letter case', () => {
			expect(
				isCmcDeposit({
					...params,
					transaction: deposit({
						transfer: {
							from: OWN_ACCOUNT_IDENTIFIER.toUpperCase(),
							to: DEPOSIT_ACCOUNT_IDENTIFIER.toUpperCase()
						}
					})
				})
			).toBeTruthy();
		});

		it.each([
			{ label: 'another recipient', transaction: deposit({ transfer: { to: 'ffff' } }) },
			// Anyone can send to the deposit account, with the same details.
			{ label: 'another sender', transaction: deposit({ transfer: { from: 'ffff' } }) },
			{ label: 'another amount', transaction: deposit({ transfer: { e8s: 1n } }) },
			{
				label: 'another deposit of the same amount',
				transaction: deposit({
					overrides: {
						created_at_time: [{ timestamp_nanos: TRANSFER_CREATED_AT_NS + 1n }]
					}
				})
			},
			{
				label: 'no creation timestamp',
				transaction: deposit({ overrides: { created_at_time: [] } })
			},
			{ label: 'no memo', transaction: deposit({ overrides: { icrc1_memo: [] } }) },
			{
				label: 'another memo',
				transaction: deposit({
					overrides: { icrc1_memo: [new Uint8Array([0x54, 0x50, 0x55, 0x50, 0, 0, 0, 0])] }
				})
			},
			{
				label: 'a memo that only starts like the expected one',
				transaction: deposit({
					overrides: { icrc1_memo: [new Uint8Array([0x4d, 0x49, 0x4e, 0x54])] }
				})
			},
			{
				label: 'another operation',
				transaction: deposit({
					overrides: {
						operation: { Mint: { to: DEPOSIT_ACCOUNT_IDENTIFIER, amount: { e8s: 1n } } }
					}
				})
			}
		])('does not match $label', ({ transaction }) => {
			expect(isCmcDeposit({ ...params, transaction })).toBeFalsy();
		});
	});
});
