<script lang="ts">
	import ModalValue from '$lib/components/ui/ModalValue.svelte';

	export let fee: number;
	export let symbol: string;
	export let label: string;
</script>

<ModalValue>
	<svelte:fragment slot="label">{label}</svelte:fragment>

	<svelte:fragment slot="main-value">
		{fee}
		{symbol}
	</svelte:fragment>
</ModalValue>
