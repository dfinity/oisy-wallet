<script lang="ts">
	import { page } from '$app/state';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import TipClaim from '$lib/components/tip/TipClaim.svelte';

	// Only the id is in the path. The claim code stays in the fragment, which
	// browsers never send to a server or put in a `Referer` header.
	const tipId = $derived(page.params.id ?? '');
</script>

<svelte:head>
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<!--
	A standalone page — `+page@` resets the layout hierarchy, the same way the
	shared-note recipient page does. It cannot live under `(app)`: `AuthGuard`
	swaps the whole route out for the marketing landing page whenever the visitor
	is signed out, which is precisely the visitor a tip link arrives at. Nor under
	`(public)`'s own layout, which is shaped for the legal documents.
-->
<div class="flex min-h-dvh flex-col items-center px-4 py-8">
	<div class="mb-8 flex items-center">
		<OisyWalletLogo />
	</div>

	<main class="w-full max-w-[545px] rounded-3xl bg-primary p-6 shadow-lg md:p-8">
		<TipClaim {tipId} />
	</main>
</div>
