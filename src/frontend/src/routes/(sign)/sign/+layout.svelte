<script lang="ts">
	import type { Snippet } from 'svelte';
	import Modals from '$lib/components/core/Modals.svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
	import PwaBanner from '$lib/components/core/PwaBanner.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<main class="mx-auto flex w-full max-w-[576px] flex-col gap-y-6 px-5 pt-10">
	<div class="hidden justify-center 1.5xs:flex"><OisyWalletLogoLink /></div>

	{@render children()}
</main>

<Modals />

<!-- TODO remove this WarningBanner again as soon a solution is found for enabling display type standalone  -->
<PwaBanner />
