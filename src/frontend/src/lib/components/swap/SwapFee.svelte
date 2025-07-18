<script lang="ts">
	import ModalValue from '$lib/components/ui/ModalValue.svelte';

	export let fee: number | string;
	export let symbol: string;
	export let feeLabel: string;
</script>

<ModalValue>
	{#snippet label()}
		{feeLabel}
	{/snippet}

	{#snippet mainValue()}
		{fee}
		{symbol}
	{/snippet}
</ModalValue>
