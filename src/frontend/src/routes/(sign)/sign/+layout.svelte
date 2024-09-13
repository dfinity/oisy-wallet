<script lang="ts">
	import LoadersGuard from '$lib/components/core/LoadersGuard.svelte';
	import Modals from '$lib/components/core/Modals.svelte';
	import OisyWalletLogoDark from '$lib/components/icons/OisyWalletLogoDark.svelte';
</script>

<main class="pt-10 flex flex-col gap-y-8">
	<OisyWalletLogoDark />

	<LoadersGuard>
		<slot />
	</LoadersGuard>
</main>

<Modals />
