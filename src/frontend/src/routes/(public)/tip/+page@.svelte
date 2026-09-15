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
	const tipId = $derived(browser ? (parseTipIdFromFragment(window.location.hash) ?? '') : '');
</script>

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
			<TipClaim {tipId} />
		{/if}
	</main>
</div>
