<script lang="ts">
	import { onMount } from 'svelte';
	import Modals from '$lib/components/core/Modals.svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
	import WarningBanner from '$lib/components/ui/WarningBanner.svelte';
	import { LOCAL } from '$lib/constants/app.constants';

	onMount(async () => {
		if (!LOCAL) {
			return;
		}

		await import('./+oisy.page.css');
	});
</script>

<main class="mx-auto flex flex-col gap-y-6 px-5 pt-10 sm:w-sm">
	<div class="flex justify-center"><OisyWalletLogoLink /></div>

	<WarningBanner>
		This feature is unreviewed. DO NOT USE until it has undergone proper code and security
		assessment!
	</WarningBanner>

	<slot />
</main>

<Modals />
