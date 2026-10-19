<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import Modals from '$lib/components/core/Modals.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// The side panel has its own header once signed in.
	let panel = $derived(page.route.id === '/(sign)/extension/panel');
</script>

<!-- The extension's popup window: only the request, no navigation that could lead the user away. -->
<main class="mx-auto flex w-full max-w-[576px] flex-col gap-y-6 px-5 pt-6 pb-8">
	{#if !panel}
		<div class="flex justify-center"><OisyWalletLogo /></div>
	{/if}

	{@render children()}
</main>

<Modals />
