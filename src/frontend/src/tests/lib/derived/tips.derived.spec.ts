import type { MyTip } from '$declarations/backend/backend.did';
import { reservedTipAmounts } from '$lib/derived/tips.derived';
import { tipsStore } from '$lib/stores/tips.store';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

// `reservedTipAmounts` is a module-level `derived`, so it captures its input
// stores when this module is first imported. The token list therefore has to be
// mocked before that happens, not spied on afterwards.
const { mockedToken } = vi.hoisted(() => ({
	mockedToken: { fee: 10_000n }
}));

vi.mock('$lib/derived/tokens.derived', async () => {
	const { mockValidIcToken } = await import('$tests/mocks/ic-tokens.mock');
	const { readable } = await import('svelte/store');

	return { tokens: readable([{ ...mockValidIcToken, fee: mockedToken.fee }]) };
});

describe('reservedTipAmounts', () => {
	const fee = 10_000n;
	const token = { ...mockValidIcToken, fee };

	const ledger = Principal.fromText(token.ledgerCanisterId);

	const tip = ({
		tip_id,
		status,
		amount = 500_000n
	}: {
		tip_id: string;
		status: MyTip['status'];
		amount?: bigint;
	}): MyTip => ({
		tip_id,
		ledger_canister_id: ledger,
		amount,
		expires_at_ns: 1_800_000_000_000_000_000n,
		created_at_ns: 1_700_000_000_000_000_000n,
		status,
		message: [],
		claimed_by: []
	});

	beforeEach(() => {
		tipsStore.reset();
	});

	it('reserves the amount plus one fee, not just the amount', () => {
		// The allowance the sender granted is amount + fee, because the ledger
		// charges the payout fee to it. Subtracting only the amount would let
		// someone spend down to where their own tip can no longer be claimed.
		tipsStore.set([tip({ tip_id: 'a', status: { Reserved: null } })]);

		expect(get(reservedTipAmounts)[token.id]).toBe(500_000n + fee);
	});

	it('sums several live tips on the same token', () => {
		tipsStore.set([
			tip({ tip_id: 'a', status: { Reserved: null } }),
			tip({ tip_id: 'b', status: { Reserved: null }, amount: 250_000n })
		]);

		expect(get(reservedTipAmounts)[token.id]).toBe(500_000n + fee + 250_000n + fee);
	});

	it('counts nothing for tips that hold no allowance any more', () => {
		// Claimed spends it, cancelled revokes it, expired lapses on the ledger.
		tipsStore.set([
			tip({ tip_id: 'claimed', status: { Claimed: null } }),
			tip({ tip_id: 'cancelled', status: { Cancelled: null } }),
			tip({ tip_id: 'expired', status: { Expired: null } })
		]);

		expect(get(reservedTipAmounts)).toEqual({});
	});

	it('reserves nothing while the tips are still unknown', () => {
		// `undefined` is "not loaded", which must not be confused with "none": the
		// alternative is briefly offering the full balance on every sign-in.
		expect(get(reservedTipAmounts)).toEqual({});
	});
});
