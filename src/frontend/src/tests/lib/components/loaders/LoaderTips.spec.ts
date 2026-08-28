import type { MyTip } from '$declarations/backend/backend.did';
import LoaderTips from '$lib/components/loaders/LoaderTips.svelte';
import * as tipServices from '$lib/services/tip.services';
import { tipsStore } from '$lib/stores/tips.store';
import { emit } from '$lib/utils/events.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { Principal } from '@icp-sdk/core/principal';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

// The loader is gated on the rollout flag, which is still off on the branch that
// owns this file. The loading behaviour is what is under test, not the flag.
//
// The string form of `vi.mock` on purpose: `vi.mock(import('$env/tips.env'), …)`
// makes the factory's return type check against the module's *literal* type, and
// `TIPS_ENABLED` is literally `false` here — so returning `true` does not
// type-check. Two existing specs already trip that.
vi.mock('$env/tips.env', () => ({ TIPS_ENABLED: true }));

describe('LoaderTips', () => {
	const tip = (id: string): MyTip => ({
		tip_id: id,
		ledger_canister_id: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
		amount: 500_000n,
		expires_at_ns: 1_800_000_000_000_000_000n,
		created_at_ns: 1_700_000_000_000_000_000n,
		status: { Reserved: null },
		message: [],
		claimed_by: [],
		last_claim_failure: []
	});

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();

		mockAuthStore();

		tipsStore.reset();
	});

	it('loads the tips on mount', async () => {
		const spy = vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([tip('one')]);

		render(LoaderTips);

		await waitFor(() => {
			expect(spy).toHaveBeenCalledOnce();
		});

		expect(get(tipsStore)).toEqual([tip('one')]);
	});

	it('reloads on the refresh event', async () => {
		// The reason this loader has an event at all. `tipsStore` feeds the overview
		// on the tips intro screen and the dot on the menu icon, and it used to load
		// once at sign-in and never again — so a sender who cancelled the failed tip
		// the warning was about kept being warned about it until a page reload.
		//
		// The event name is a bare string on both sides, with no shared constant to
		// keep them honest. This is the half that pins it.
		const spy = vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([tip('one')]);

		render(LoaderTips);

		await waitFor(() => {
			expect(spy).toHaveBeenCalledOnce();
		});

		spy.mockResolvedValue([tip('one'), tip('two')]);

		emit({ message: 'oisyRefreshTips' });

		await waitFor(() => {
			expect(spy).toHaveBeenCalledTimes(2);
		});

		expect(get(tipsStore)).toEqual([tip('one'), tip('two')]);
	});

	it('leaves the store unloaded when the fetch fails', async () => {
		// Unloaded is not the same as empty: an empty array would tell the wallet
		// nothing is reserved and let the user spend money already promised away.
		const spy = vi.spyOn(tipServices, 'loadMyTips').mockRejectedValue(new Error('boom'));

		render(LoaderTips);

		await waitFor(() => {
			expect(spy).toHaveBeenCalledOnce();
		});

		expect(get(tipsStore)).toBeUndefined();
	});

	describe('when identity is nullish', () => {
		beforeEach(() => {
			mockAuthStore(null);
		});

		it('does not load, and resets the store', () => {
			const spy = vi.spyOn(tipServices, 'loadMyTips');

			tipsStore.set([tip('stale')]);

			render(LoaderTips);

			expect(spy).not.toHaveBeenCalled();

			expect(get(tipsStore)).toBeUndefined();
		});
	});
});
