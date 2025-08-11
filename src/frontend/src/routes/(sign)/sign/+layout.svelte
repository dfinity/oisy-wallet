<script lang="ts">
	import type { Snippet } from 'svelte';
	import Modals from '$lib/components/core/Modals.svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<main class="mx-auto flex flex-col gap-y-6 px-5 pt-10 sm:w-sm">
	<div class="flex justify-center"><OisyWalletLogoLink /></div>

	{@render children()}
</main>

<Modals />
