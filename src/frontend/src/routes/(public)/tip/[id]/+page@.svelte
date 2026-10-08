<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { buildTipClaimPath, parseClaimCodeFromFragment } from '$lib/services/tip.services';

	// Only the id is in the path. The claim code stays in the fragment, which
	// browsers never send to a server or put in a `Referer` header.
	const tipId = $derived(page.params.id ?? '');

	/**
	 * Forwards to the canonical claim page rather than being a second one.
	 *
	 * This route is vestigial. Nothing produces links to it — `buildTipLink` only
	 * ever emits `/tip#i=…&c=…` — and `../+page.ts` explains why: a link preview is
	 * fetched by a crawler that never sends the fragment, and the asset canister
	 * only returns a prerendered document for an exact path, so `/tip/<id>` could
	 * never carry a card of its own. `/tip` exists precisely because this shape
	 * could not work.
	 *
	 * Keeping it as a second claim surface meant maintaining the same flow twice,
	 * and it had already drifted: the canonical page reloads when the fragment
	 * changes, this one only when the id did — so replacing a truncated code in
	 * the same tab left the previous tip on screen. Forwarding removes the
	 * duplicate instead of fixing the same bug in both places, and a hand-made
	 * link of this shape still lands somewhere that works.
	 */
	$effect(() => {
		if (!browser) {
			return;
		}

		// Redirected client-side, not from a `load`: a browser never sends the
		// fragment, so the server has no claim code to forward and only this side
		// can carry it across. `replaceState`, so Back returns to wherever the
		// reader came from rather than to a path that immediately forwards again.
		void goto(
			buildTipClaimPath({ tipId, claimCode: parseClaimCodeFromFragment(window.location.hash) }),
			{ replaceState: true }
		);
	});
</script>

<svelte:head>
	<meta name="referrer" content="no-referrer" />
</svelte:head>
