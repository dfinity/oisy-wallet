import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { BTC_REGTEST_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { CMC_MINT_CYCLES_MEMO } from '$icp/constants/cmc.constants';
import { ZERO } from '$lib/constants/app.constants';
import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { CYCLES_MINT_EXTERNAL_REF_KEYS } from '$lib/types/cycles-mint-active-tx';
import {
	isCyclesMintActiveUserTransaction,
	isCyclesMintDeposit,
	toCyclesMintCredited,
	toCyclesMintData,
	toCyclesMintDisplayRefs,
	toCyclesMintExternalRefs,
	toCyclesMintExternalRefsMap,
	toCyclesMintOutcome,
	toCyclesMintRefBlockIndex,
	toCyclesMintRowUpdate,
	toCyclesMintTrackingParams
} from '$lib/utils/cycles-mint-active-tx.utils';
import {
	mockCyclesMintActiveUserTransaction,
	mockCyclesMintData,
	mockOisyTradeActiveUserTransaction
} from '$tests/mocks/active-user-transactions.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';

const TCYCLES_TOKEN = {
	...mockValidIcrcToken,
	symbol: 'TCYCLES',
	decimals: 12,
	ledgerCanisterId: 'um5iw-rqaaa-aaaaq-qaaba-cai'
};

const DEPOSIT_ACCOUNT_IDENTIFIER = 'a1b2c3';

const deposit = ({
	overrides = {},
	transfer = {}
}: {
	overrides?: Partial<IcpIndexDid.Transaction>;
	transfer?: Partial<{ to: string; e8s: bigint }>;
} = {}): IcpIndexDid.Transaction => ({
	memo: ZERO,
	icrc1_memo: [CMC_MINT_CYCLES_MEMO],
	operation: {
		Transfer: {
			to: transfer.to ?? DEPOSIT_ACCOUNT_IDENTIFIER,
			fee: { e8s: 10_000n },
			from: 'f00',
			amount: { e8s: transfer.e8s ?? mockCyclesMintData.amount },
			spender: []
		}
	},
	timestamp: [{ timestamp_nanos: mockCyclesMintData.transfer_created_at_ns + 1n }],
	created_at_time: [{ timestamp_nanos: mockCyclesMintData.transfer_created_at_ns }],
	...overrides
});

const withRefs = ({
	tx,
	refs
}: {
	tx: ActiveUserTransaction;
	refs: Partial<Record<string, string>>;
}): ActiveUserTransaction => ({
	...tx,
	external_refs: toCyclesMintExternalRefs({
		...toCyclesMintExternalRefsMap(tx.external_refs),
		...refs
	})
});

describe('cycles-mint-active-tx.utils', () => {
	describe('isCyclesMintActiveUserTransaction', () => {
		it('is true for a mint row only', () => {
			expect(isCyclesMintActiveUserTransaction(mockCyclesMintActiveUserTransaction)).toBeTruthy();
			expect(isCyclesMintActiveUserTransaction(mockOisyTradeActiveUserTransaction)).toBeFalsy();
		});
	});

	describe('toCyclesMintData', () => {
		it('builds the variant from both tokens, the amount and the transfer timestamp', () => {
			expect(
				toCyclesMintData({
					sourceToken: ICP_TOKEN,
					destinationToken: TCYCLES_TOKEN,
					amount: 150_000_000n,
					transferCreatedAtNs: 42n
				})
			).toEqual({
				CyclesMint: {
					source_token: { Icrc: Principal.fromText(ICP_TOKEN.ledgerCanisterId) },
					dest_token: { Icrc: Principal.fromText(TCYCLES_TOKEN.ledgerCanisterId) },
					amount: 150_000_000n,
					transfer_created_at_ns: 42n
				}
			});
		});

		it('is undefined when a token has no backend id', () => {
			expect(
				toCyclesMintData({
					sourceToken: BTC_REGTEST_TOKEN,
					destinationToken: TCYCLES_TOKEN,
					amount: 1n,
					transferCreatedAtNs: 1n
				})
			).toBeUndefined();
		});
	});

	describe('toCyclesMintExternalRefs', () => {
		it('sorts the keys and drops empty values', () => {
			expect(
				toCyclesMintExternalRefs({
					[CYCLES_MINT_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]: '12',
					[CYCLES_MINT_EXTERNAL_REF_KEYS.AMOUNT]: '1.5',
					[CYCLES_MINT_EXTERNAL_REF_KEYS.OUTCOME]: ''
				})
			).toEqual([
				{ key: CYCLES_MINT_EXTERNAL_REF_KEYS.AMOUNT, value: '1.5' },
				{ key: CYCLES_MINT_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX, value: '12' }
			]);
		});

		it('round-trips through the map', () => {
			const refs = {
				[CYCLES_MINT_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]: '12',
				[CYCLES_MINT_EXTERNAL_REF_KEYS.AMOUNT]: '1.5'
			};

			expect(toCyclesMintExternalRefsMap(toCyclesMintExternalRefs(refs))).toEqual(refs);
		});
	});

	describe('toCyclesMintDisplayRefs', () => {
		it('writes the swap providers’ display keys', () => {
			expect(
				toCyclesMintDisplayRefs({
					sourceToken: ICP_TOKEN,
					destinationToken: TCYCLES_TOKEN,
					amount: '1.5',
					usdSourceValue: '4.5'
				})
			).toEqual({
				amount: '1.5',
				usd_source_value: '4.5',
				source_token_symbol: 'ICP',
				source_network_symbol: ICP_TOKEN.network.name,
				destination_token_symbol: 'TCYCLES',
				destination_network_symbol: TCYCLES_TOKEN.network.name
			});
		});

		it('omits the USD value when there is none', () => {
			expect(
				toCyclesMintDisplayRefs({
					sourceToken: ICP_TOKEN,
					destinationToken: TCYCLES_TOKEN,
					amount: '1.5'
				})
			).not.toHaveProperty('usd_source_value');
		});
	});

	describe('toCyclesMintRefBlockIndex', () => {
		it('parses a block index', () => {
			expect(toCyclesMintRefBlockIndex('12')).toBe(12n);
			expect(toCyclesMintRefBlockIndex('0')).toBe(ZERO);
		});

		// A ref that does not parse must read as "no deposit known": block 0 would be
		// notified, and the CMC would call it an invalid transaction.
		it.each([undefined, '', '-1', '1.5', 'abc', ' 12'])('is undefined for %s', (value) => {
			expect(toCyclesMintRefBlockIndex(value)).toBeUndefined();
		});
	});

	describe('toCyclesMintOutcome', () => {
		it.each(['minted', 'refunded', 'failed'])('reads %s', (value) => {
			expect(toCyclesMintOutcome(value)).toBe(value);
		});

		it.each([undefined, '', 'pending'])('is undefined for %s', (value) => {
			expect(toCyclesMintOutcome(value)).toBeUndefined();
		});
	});

	describe('toCyclesMintCredited', () => {
		it('takes the cycles ledger’s deposit fee off what the CMC minted', () => {
			expect(toCyclesMintCredited(1_000_000_000_000n)).toBe(999_900_000_000n);
		});

		it('is zero when the fee takes it all', () => {
			expect(toCyclesMintCredited(100_000_000n)).toBe(ZERO);
			expect(toCyclesMintCredited(1n)).toBe(ZERO);
		});
	});

	describe('toCyclesMintRowUpdate', () => {
		it('leaves a pending mint alone', () => {
			expect(toCyclesMintRowUpdate({ status: 'pending' })).toBeUndefined();
		});

		it('closes a mint as succeeded with what was credited', () => {
			expect(
				toCyclesMintRowUpdate({
					status: 'minted',
					minted: 4_500_000_000_000n,
					balance: 4_499_900_000_000n
				})
			).toEqual({
				status: { Succeeded: null },
				learned: {
					[CYCLES_MINT_EXTERNAL_REF_KEYS.OUTCOME]: 'minted',
					[CYCLES_MINT_EXTERNAL_REF_KEYS.CREDITED_AMOUNT]: '4.4999'
				}
			});
		});

		it('closes a refund as failed, with the reason and the refund block', () => {
			expect(
				toCyclesMintRowUpdate({ status: 'refunded', reason: 'limit', refundBlockIndex: 99n })
			).toEqual({
				status: { Failed: null },
				error: 'limit',
				learned: {
					[CYCLES_MINT_EXTERNAL_REF_KEYS.OUTCOME]: 'refunded',
					[CYCLES_MINT_EXTERNAL_REF_KEYS.REFUND_BLOCK_INDEX]: '99'
				}
			});
		});

		it('omits the refund block when nothing came back', () => {
			expect(toCyclesMintRowUpdate({ status: 'refunded', reason: 'limit' })?.learned).toEqual({
				[CYCLES_MINT_EXTERNAL_REF_KEYS.OUTCOME]: 'refunded'
			});
		});

		it('closes a final CMC error as failed', () => {
			expect(toCyclesMintRowUpdate({ status: 'failed', reason: 'invalid' })).toEqual({
				status: { Failed: null },
				error: 'invalid',
				learned: { [CYCLES_MINT_EXTERNAL_REF_KEYS.OUTCOME]: 'failed' }
			});
		});

		// The backend refuses a longer `error`, and a refused terminal write would leave the
		// poller notifying the same final answer forever.
		it('cuts the reason to the backend’s 512 bytes, counting bytes, not characters', () => {
			const update = toCyclesMintRowUpdate({ status: 'failed', reason: 'é'.repeat(600) });

			expect(new TextEncoder().encode(update?.error).length).toBeLessThanOrEqual(512);
			expect(update?.error).toBe('é'.repeat(256));
		});
	});

	describe('isCyclesMintDeposit', () => {
		const params = {
			depositAccountIdentifier: DEPOSIT_ACCOUNT_IDENTIFIER,
			data: mockCyclesMintData
		};

		it('matches the row’s deposit', () => {
			expect(isCyclesMintDeposit({ ...params, transaction: deposit() })).toBeTruthy();
		});

		it('compares the account in any letter case', () => {
			expect(
				isCyclesMintDeposit({
					...params,
					transaction: deposit({ transfer: { to: DEPOSIT_ACCOUNT_IDENTIFIER.toUpperCase() } })
				})
			).toBeTruthy();
		});

		it.each([
			{ label: 'another account', transaction: deposit({ transfer: { to: 'ffff' } }) },
			{ label: 'another amount', transaction: deposit({ transfer: { e8s: 1n } }) },
			{
				label: 'another mint of the same amount',
				transaction: deposit({
					overrides: {
						created_at_time: [{ timestamp_nanos: mockCyclesMintData.transfer_created_at_ns + 1n }]
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
				label: 'a memo that only starts like MINT',
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
			expect(isCyclesMintDeposit({ ...params, transaction })).toBeFalsy();
		});
	});

	describe('toCyclesMintTrackingParams', () => {
		it('reports a success with what was credited', () => {
			expect(
				toCyclesMintTrackingParams({
					tx: withRefs({
						tx: { ...mockCyclesMintActiveUserTransaction, status: { Succeeded: null } },
						refs: {
							[CYCLES_MINT_EXTERNAL_REF_KEYS.OUTCOME]: 'minted',
							[CYCLES_MINT_EXTERNAL_REF_KEYS.CREDITED_AMOUNT]: '4.4999'
						}
					})
				})
			).toEqual({
				step: 'mint',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				sourceSymbol: 'ICP',
				sourceAmount: '1.5',
				sourceUsdValue: '4.5',
				destinationSymbol: 'TCYCLES',
				destinationAmount: '4.4999'
			});
		});

		it('reports a refund as its own error code', () => {
			expect(
				toCyclesMintTrackingParams({
					tx: withRefs({
						tx: { ...mockCyclesMintActiveUserTransaction, status: { Failed: null } },
						refs: { [CYCLES_MINT_EXTERNAL_REF_KEYS.OUTCOME]: 'refunded' }
					})
				})
			).toEqual(
				expect.objectContaining({
					resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
					errorCode: 'refunded'
				})
			);
		});

		it('reports any other failure as failed', () => {
			expect(
				toCyclesMintTrackingParams({
					tx: { ...mockCyclesMintActiveUserTransaction, status: { Failed: null } }
				}).errorCode
			).toBe('failed');
		});

		// The CMC's reason text can name the caller's account.
		it('never carries the row’s error text', () => {
			const params = toCyclesMintTrackingParams({
				tx: {
					...mockCyclesMintActiveUserTransaction,
					status: { Failed: null },
					error: ['account aaaaa-aa refunded']
				}
			});

			expect(JSON.stringify(params)).not.toContain('aaaaa-aa');
		});
	});
});
