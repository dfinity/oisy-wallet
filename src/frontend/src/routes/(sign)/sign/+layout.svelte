<script lang="ts">
	import LoadersGuard from '$lib/components/core/LoadersGuard.svelte';
	import Modals from '$lib/components/core/Modals.svelte';
	import OisyWalletLogoDark from '$lib/components/icons/OisyWalletLogoDark.svelte';
</script>

<main class="pt-12 flex flex-col gap-y-10">
	<OisyWalletLogoDark />

	<LoadersGuard>
		<slot />
	</LoadersGuard>
</main>

<Modals />
