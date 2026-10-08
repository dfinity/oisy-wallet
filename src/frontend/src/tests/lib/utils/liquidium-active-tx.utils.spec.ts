import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { ZERO } from '$lib/constants/app.constants';
import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
import {
	buildLiquidiumTrackingMetadata,
	isLiquidiumActiveUserTransaction,
	liquidiumActionKey,
	liquidiumActivityToStatus,
	liquidiumTrackingMetadata,
	toLiquidiumExternalRefs,
	toLiquidiumExternalRefsMap
} from '$lib/utils/liquidium-active-tx.utils';
import type { Activity, LiquidiumState } from '@liquidium/client';

const activityStatus = (state: LiquidiumState): Activity['status'] => ({
	operation: 'deposit',
	state,
	confirmations: null,
	requiredConfirmations: null
});

const liquidiumTx: ActiveUserTransaction = {
	id: 'tx-1',
	status: { Pending: null },
	external_refs: [],
	progress_step: [],
	data: {
		Liquidium: {
			token: { SolNativeDevnet: null },
			action: { Supply: null },
			pool_id: 'pool-btc',
			amount: 100n
		}
	},
	updated_at_ns: ZERO,
	error: [],
	created_at_ns: ZERO
};

describe('liquidium-active-tx.utils', () => {
	describe('isLiquidiumActiveUserTransaction', () => {
		it('is true for a Liquidium transaction', () => {
			expect(isLiquidiumActiveUserTransaction(liquidiumTx)).toBeTruthy();
		});
	});

	describe('external refs round-trip', () => {
		it('builds a sorted (key, value) array, dropping empties', () => {
			const refs = toLiquidiumExternalRefs({
				[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: 'profile-1',
				[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: '0xabc',
				[LIQUIDIUM_EXTERNAL_REF_KEYS.AMOUNT]: ''
			});

			expect(refs).toEqual([
				{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID, value: 'profile-1' },
				{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.TXID, value: '0xabc' }
			]);
		});

		it('maps a (key, value) array back to a keyed lookup', () => {
			expect(
				toLiquidiumExternalRefsMap([
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID, value: 'profile-1' }
				])
			).toEqual({ [LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: 'profile-1' });
		});
	});

	describe('liquidiumActionKey', () => {
		it.each([
			{ action: { Supply: null }, key: 'supply' },
			{ action: { Borrow: null }, key: 'borrow' },
			{ action: { Repay: null }, key: 'repay' },
			{ action: { Withdraw: null }, key: 'withdraw' }
		])('maps $key', ({ action, key }) => {
			expect(liquidiumActionKey(action)).toBe(key);
		});
	});

	describe('liquidiumActivityToStatus', () => {
		it.each([
			{ state: 'completed', expected: { Succeeded: null } },
			{ state: 'active', expected: { Succeeded: null } },
			{ state: 'failed', expected: { Failed: null } },
			{ state: 'expired', expected: { Failed: null } },
			{ state: 'confirming', expected: { Executing: null } },
			{ state: 'processing', expected: { Executing: null } }
		] as const)('maps $state', ({ state, expected }) => {
			expect(liquidiumActivityToStatus(activityStatus(state))).toEqual(expected);
		});

		it('does not advance on action_required', () => {
			expect(liquidiumActivityToStatus(activityStatus('action_required'))).toBeUndefined();
		});
	});

	describe('liquidiumTrackingMetadata', () => {
		it('builds the metadata shape', () => {
			expect(
				liquidiumTrackingMetadata({ action: 'supply', token: 'BTC', tokenAmount: '1' })
			).toEqual({ dApp: 'liquidium', action: 'supply', token: 'BTC', tokenAmount: '1' });
		});

		it('includes the error when provided', () => {
			expect(
				liquidiumTrackingMetadata({
					action: 'supply',
					token: 'BTC',
					tokenAmount: '1',
					error: 'boom'
				})
			).toEqual({
				dApp: 'liquidium',
				action: 'supply',
				token: 'BTC',
				tokenAmount: '1',
				error: 'boom'
			});
		});
	});

	describe('buildLiquidiumTrackingMetadata', () => {
		it('builds metadata from the row refs and action', () => {
			const tx: ActiveUserTransaction = {
				...liquidiumTx,
				external_refs: [
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.ASSET_SYMBOL, value: 'BTC' },
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.AMOUNT, value: '1' }
				]
			};

			expect(buildLiquidiumTrackingMetadata({ tx })).toEqual({
				dApp: 'liquidium',
				action: 'supply',
				token: 'BTC',
				tokenAmount: '1'
			});
		});

		it('surfaces the row error', () => {
			const tx: ActiveUserTransaction = { ...liquidiumTx, error: ['failed'] };

			expect(buildLiquidiumTrackingMetadata({ tx })).toEqual(
				expect.objectContaining({ error: 'failed' })
			);
		});
	});
});
