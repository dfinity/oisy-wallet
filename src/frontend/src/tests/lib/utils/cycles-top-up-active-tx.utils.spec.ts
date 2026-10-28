import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { CYCLES_TOP_UP_EXTERNAL_REF_KEYS } from '$lib/types/cycles-top-up-active-tx';
import {
	isCyclesTopUpActiveUserTransaction,
	toCyclesTopUpData,
	toCyclesTopUpDisplayRefs,
	toCyclesTopUpExternalRefs,
	toCyclesTopUpExternalRefsMap,
	toCyclesTopUpOutcome,
	toCyclesTopUpRowUpdate,
	toCyclesTopUpTrackingParams
} from '$lib/utils/cycles-top-up-active-tx.utils';
import {
	mockCyclesMintActiveUserTransaction,
	mockCyclesTopUpActiveUserTransaction
} from '$tests/mocks/active-user-transactions.mock';
import { Principal } from '@icp-sdk/core/principal';

const CANISTER = Principal.fromText('ywcsb-maaaa-aaaai-q6k7a-cai');

const withRefs = ({
	tx,
	refs
}: {
	tx: ActiveUserTransaction;
	refs: Partial<Record<string, string>>;
}): ActiveUserTransaction => ({
	...tx,
	external_refs: toCyclesTopUpExternalRefs({
		...toCyclesTopUpExternalRefsMap(tx.external_refs),
		...refs
	})
});

describe('cycles-top-up-active-tx.utils', () => {
	describe('isCyclesTopUpActiveUserTransaction', () => {
		it('is true for a top-up row only', () => {
			expect(isCyclesTopUpActiveUserTransaction(mockCyclesTopUpActiveUserTransaction)).toBeTruthy();
			expect(isCyclesTopUpActiveUserTransaction(mockCyclesMintActiveUserTransaction)).toBeFalsy();
		});
	});

	describe('toCyclesTopUpData', () => {
		it('builds the variant from the token, the canister, the amount and the transfer timestamp', () => {
			expect(
				toCyclesTopUpData({
					sourceToken: ICP_TOKEN,
					canisterId: CANISTER,
					amount: 150_000_000n,
					transferCreatedAtNs: 1_700_000_000_000_000_000n
				})
			).toEqual({
				CyclesTopUp: {
					source_token: { Icrc: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai') },
					canister_id: CANISTER,
					amount: 150_000_000n,
					transfer_created_at_ns: 1_700_000_000_000_000_000n
				}
			});
		});
	});

	describe('toCyclesTopUpExternalRefs', () => {
		it('sorts the keys, drops empty values and round-trips through the map', () => {
			const refs = toCyclesTopUpExternalRefs({
				[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: 'ICP',
				[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.AMOUNT]: '1.5',
				[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.OUTCOME]: ''
			});

			expect(refs).toEqual([
				{ key: CYCLES_TOP_UP_EXTERNAL_REF_KEYS.AMOUNT, value: '1.5' },
				{ key: CYCLES_TOP_UP_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL, value: 'ICP' }
			]);
			expect(toCyclesTopUpExternalRefs(toCyclesTopUpExternalRefsMap(refs))).toEqual(refs);
		});
	});

	describe('toCyclesTopUpDisplayRefs', () => {
		it('writes the swap providers’ source keys, and no destination', () => {
			expect(
				toCyclesTopUpDisplayRefs({ sourceToken: ICP_TOKEN, amount: '1.5', usdSourceValue: '4.5' })
			).toEqual({
				[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.AMOUNT]: '1.5',
				[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE]: '4.5',
				[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: ICP_TOKEN.symbol,
				[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: ICP_TOKEN.network.name
			});
		});

		it('omits the USD value when there is none', () => {
			expect(
				toCyclesTopUpDisplayRefs({ sourceToken: ICP_TOKEN, amount: '1.5' })
			).not.toHaveProperty(CYCLES_TOP_UP_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE);
		});
	});

	describe('toCyclesTopUpOutcome', () => {
		it.each(['topped_up', 'refunded', 'failed', 'not_sent'])('reads %s', (outcome) => {
			expect(toCyclesTopUpOutcome(outcome)).toBe(outcome);
		});

		it('reads anything else as no outcome', () => {
			expect(toCyclesTopUpOutcome('minted')).toBeUndefined();
			expect(toCyclesTopUpOutcome(undefined)).toBeUndefined();
		});
	});

	describe('toCyclesTopUpRowUpdate', () => {
		it('leaves a pending top-up alone', () => {
			expect(toCyclesTopUpRowUpdate({ status: 'pending' })).toBeUndefined();
		});

		it('closes a top-up as succeeded with the cycles the CMC deposited, in trillions', () => {
			expect(toCyclesTopUpRowUpdate({ status: 'topped_up', cycles: 2_490_000_000_000n })).toEqual({
				status: { Succeeded: null },
				learned: {
					[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.OUTCOME]: 'topped_up',
					[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.CYCLES]: '2.49'
				}
			});
		});

		it('closes a refund as failed, with the reason and the refund block', () => {
			expect(
				toCyclesTopUpRowUpdate({
					status: 'refunded',
					reason: 'Canister not found',
					refundBlockIndex: 13n
				})
			).toEqual({
				status: { Failed: null },
				error: 'Canister not found',
				learned: {
					[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.OUTCOME]: 'refunded',
					[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.REFUND_BLOCK_INDEX]: '13'
				}
			});
		});

		it('closes a final CMC error as failed', () => {
			expect(toCyclesTopUpRowUpdate({ status: 'failed', reason: 'Wrong memo' })).toEqual({
				status: { Failed: null },
				error: 'Wrong memo',
				learned: { [CYCLES_TOP_UP_EXTERNAL_REF_KEYS.OUTCOME]: 'failed' }
			});
		});

		it('cuts the reason to the backend’s 512 bytes', () => {
			const update = toCyclesTopUpRowUpdate({ status: 'failed', reason: 'é'.repeat(400) });

			expect(new TextEncoder().encode(update?.error).length).toBeLessThanOrEqual(512);
		});
	});

	describe('toCyclesTopUpTrackingParams', () => {
		it('reports a success from the navigation with the token paid', () => {
			expect(
				toCyclesTopUpTrackingParams({
					tx: withRefs({
						tx: { ...mockCyclesTopUpActiveUserTransaction, status: { Succeeded: null } },
						refs: { [CYCLES_TOP_UP_EXTERNAL_REF_KEYS.OUTCOME]: 'topped_up' }
					})
				})
			).toEqual({
				step: 'top_up',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				tokenSymbol: 'ICP',
				sourceLocation: 'navigation'
			});
		});

		it.each([
			{ outcome: 'refunded', errorCode: 'refunded' },
			{ outcome: 'not_sent', errorCode: 'not_sent' },
			{ outcome: 'failed', errorCode: 'failed' },
			{ outcome: undefined, errorCode: 'failed' }
		])('reports a failed row that ended $outcome as $errorCode', ({ outcome, errorCode }) => {
			expect(
				toCyclesTopUpTrackingParams({
					tx: withRefs({
						tx: { ...mockCyclesTopUpActiveUserTransaction, status: { Failed: null } },
						refs: { [CYCLES_TOP_UP_EXTERNAL_REF_KEYS.OUTCOME]: outcome }
					})
				})
			).toEqual(expect.objectContaining({ resultStatus: 'error', errorCode }));
		});

		it('never carries an amount, the canister or the CMC’s reason', () => {
			const params = toCyclesTopUpTrackingParams({
				tx: { ...mockCyclesTopUpActiveUserTransaction, status: { Failed: null }, error: ['why'] }
			});

			expect(JSON.stringify(params)).not.toMatch(/1\.5|4\.5|ywcsb|why/);
		});
	});
});
