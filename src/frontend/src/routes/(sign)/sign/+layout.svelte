<script lang="ts">
	import Modals from '$lib/components/core/Modals.svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
</script>

<main class="mx-auto flex flex-col gap-y-6 px-5 pt-10 sm:w-sm">
	<div class="flex justify-center"><OisyWalletLogoLink /></div>

	<slot />
</main>

<Modals />
