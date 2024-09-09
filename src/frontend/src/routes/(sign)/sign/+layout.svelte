<script lang="ts">
	import Modals from '$lib/components/core/Modals.svelte';
	import LoadersGuard from '$lib/components/core/LoadersGuard.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
</script>

<main class="pt-12 flex flex-col gap-y-10">
	<OisyWalletLogo />

	<LoadersGuard>
		<slot />
	</LoadersGuard>
</main>

<Modals />
