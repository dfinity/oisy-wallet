import type { MyTip } from '$declarations/backend/backend.did';
import { reservedTipAmounts, tipsOverview } from '$lib/derived/tips.derived';
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

vi.mock(import('$lib/derived/tokens.derived'), async (importOriginal) => {
	const actual = await importOriginal();
	const { mockValidIcToken } = await import('$tests/mocks/ic-tokens.mock');
	const { readable } = await import('svelte/store');

	// Partial: `tipsOverview` also reads the exchange store, whose import chain
	// pulls other exports from this module.
	return { ...actual, tokens: readable([{ ...mockValidIcToken, fee: mockedToken.fee }]) };
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
		claimed_by: [],
		last_claim_failure: []
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

	it('counts a failed tip, which still holds its allowance', () => {
		// A failed tip is one somebody tried to claim and could not. Nothing moved,
		// the allowance is still granted and the code still works — so it encumbers
		// the balance exactly as an untouched reservation does. Missing this would
		// understate the reservation in the one situation where the sender most needs
		// the number right, since topping up is the fix.
		tipsStore.set([tip({ tip_id: 'stuck', status: { Failed: null } })]);

		expect(get(reservedTipAmounts)[token.id]).toBe(500_000n + fee);
	});

	it('ignores tips that hold nothing', () => {
		tipsStore.set([
			tip({ tip_id: 'done', status: { Claimed: null } }),
			tip({ tip_id: 'gone', status: { Expired: null } }),
			tip({ tip_id: 'revoked', status: { Cancelled: null } })
		]);

		expect(get(reservedTipAmounts)[token.id]).toBeUndefined();
	});
});

describe('tipsOverview', () => {
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
		claimed_by: [],
		last_claim_failure: []
	});

	beforeEach(() => {
		tipsStore.reset();
	});

	it('says there is nothing to show before any tip exists', () => {
		// A first-time sender must not be shown an empty summary block.
		expect(get(tipsOverview).hasAny).toBeFalsy();
	});

	it('counts each group separately, with failed on its own', () => {
		// The whole point of the summary: a tip nobody could claim must not be
		// indistinguishable from one nobody has tried yet.
		tipsStore.set([
			tip({ tip_id: 'a', status: { Reserved: null } }),
			tip({ tip_id: 'b', status: { Reserved: null } }),
			tip({ tip_id: 'c', status: { Failed: null } }),
			tip({ tip_id: 'd', status: { Claimed: null } }),
			tip({ tip_id: 'e', status: { Expired: null } }),
			tip({ tip_id: 'f', status: { Cancelled: null } })
		]);

		const overview = get(tipsOverview);

		expect(overview.failed).toBe(1);
		expect(overview.open).toBe(2);
		expect(overview.claimed).toBe(1);
		expect(overview.hasAny).toBeTruthy();
	});

	it('shows nothing when every tip has already lapsed', () => {
		// The hole this closes: `hasAny` used to mean "this sender has rows", so
		// somebody whose tips had all expired or been cancelled got a block of three
		// zeros instead of nothing.
		tipsStore.set([
			tip({ tip_id: 'gone', status: { Expired: null } }),
			tip({ tip_id: 'revoked', status: { Cancelled: null } })
		]);

		expect(get(tipsOverview).hasAny).toBeFalsy();
	});

	it('counts a failed tip as money still held', () => {
		// Its allowance is still granted, so it belongs with the open figure rather
		// than with what has already been paid out.
		tipsStore.set([tip({ tip_id: 'stuck', status: { Failed: null } })]);

		const overview = get(tipsOverview);

		expect(overview.claimedUsd).toBe(0);
		expect(overview.failed).toBe(1);
	});

	it('leaves the money at zero when no rate has loaded', () => {
		// Counts still work; the fiat figure is simply absent, and the screen omits
		// it rather than printing $0.00 over real tips.
		tipsStore.set([tip({ tip_id: 'a', status: { Claimed: null } })]);

		expect(get(tipsOverview).claimedUsd).toBe(0);
		expect(get(tipsOverview).claimed).toBe(1);
	});
});
