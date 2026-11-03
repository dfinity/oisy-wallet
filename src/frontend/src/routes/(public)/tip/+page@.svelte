<script lang="ts">
	import { browser } from '$app/environment';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import TipClaim from '$lib/components/tip/TipClaim.svelte';
	import { parseTipIdFromFragment } from '$lib/services/tip.services';

	// Both values live in the fragment, which is never sent to a server and is not
	// available while this page is being prerendered. Read synchronously rather
	// than in `onMount` so `TipClaim` mounts with the id already in hand — it
	// starts loading immediately, and an empty id would earn it a rejection that
	// reads as a verdict on the tip.
	//
	// Held in state and refreshed on `hashchange`, because `window.location.hash`
	// is not something Svelte can track: read straight into a `$derived` it was
	// sampled once and never again. Opening a second tip link while already on
	// this page changes only the fragment, so the browser fires `hashchange` and
	// navigates nowhere — and the page went on showing the first tip. That is the
	// likely path, not an exotic one: the unavailable screen tells the reader to
	// ask for a new link, and pasting it in the same tab is what they then do.
	let hash = $state(browser ? window.location.hash : '');
	const tipId = $derived(parseTipIdFromFragment(hash) ?? '');
</script>

<svelte:window onhashchange={() => ({ hash } = window.location)} />

<svelte:head>
	<!--
		The share card is *not* set here. `routes/+layout.ts` sets `ssr = false`, so
		prerendering emits only the shell and a component's head never reaches the
		HTML — which is also why the meta below only takes effect once this page is
		live in a browser, never for a crawler. The card is injected into
		`build/tip/index.html` by `scripts/build.seo.mjs`, alongside the per-page
		canonical it already rewrites.
	-->

	<!-- The fragment carries a bearer claim code, so no referrer may leave with it. -->
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<!--
	A standalone page — `+page@` resets the layout hierarchy, the same way the
	`/tip/<id>` page and the shared-note recipient page do. It cannot live under
	`(app)`: `AuthGuard` swaps the whole route out for the marketing landing page
	whenever the visitor is signed out, which is precisely the visitor a tip link
	arrives at.
-->
<div class="flex min-h-dvh flex-col items-center px-4 py-8">
	<div class="mb-8 flex items-center">
		<OisyWalletLogo />
	</div>

	<main class="w-full max-w-[545px] rounded-3xl bg-primary p-6 shadow-lg md:p-8">
		<!--
			Withheld while prerendering. The claim flow needs the fragment to do
			anything at all, so rendering it into the static document would put a
			permanently unclaimable screen in the file a crawler reads.
		-->
		{#if browser}
			<!--
				Keyed on the whole fragment, not just the id. A fresh fragment is a
				different tip, and remounting is what guarantees none of the previous
				one's state — preview, token metadata, which step it had reached —
				survives into it. Keying on `tipId` alone would miss a link that reuses
				an id with a different claim code.
			-->
			{#key hash}
				<TipClaim {tipId} />
			{/key}
		{/if}
	</main>
</div>
