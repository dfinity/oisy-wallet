<script lang="ts">
	import ModalValue from '$lib/components/ui/ModalValue.svelte';

	interface Props {
		fee: number | string;
		symbol: string;
		feeLabel: string;
	}

	let { fee, symbol, feeLabel }: Props = $props();
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
