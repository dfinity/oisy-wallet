<script lang="ts">
	import Modals from '$lib/components/core/Modals.svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
</script>

<main class="gap-y-6 px-5 pt-10 mx-auto flex flex-col sm:w-sm">
	<div class="flex justify-center"><OisyWalletLogoLink /></div>

	<slot />
</main>

<Modals />
