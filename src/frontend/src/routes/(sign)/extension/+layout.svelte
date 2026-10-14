<script lang="ts">
	import type { Snippet } from 'svelte';
	import Modals from '$lib/components/core/Modals.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<!-- The extension's popup window: only the request, no navigation that could lead the user away. -->
<main class="mx-auto flex w-full max-w-[576px] flex-col gap-y-6 px-5 pt-6 pb-8">
	<div class="flex justify-center"><OisyWalletLogo /></div>

	{@render children()}
</main>

<Modals />
