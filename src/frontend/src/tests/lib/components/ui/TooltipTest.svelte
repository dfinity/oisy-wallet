<script lang="ts">
	import Tooltip from '$lib/components/ui/Tooltip.svelte';

	interface Props {
		id?: string;
		idPrefix?: string;
		text?: string;
		slotText?: string;
	}

	let { id, idPrefix, text, slotText }: Props = $props();
</script>

{#if slotText === undefined}
	<Tooltip {id} {idPrefix} {text}>
		<p>content</p>
	</Tooltip>
{:else}
	<Tooltip {id} {idPrefix}>
		<p>content</p>
		{#snippet tooltipContent()}
			<div>{slotText}</div>
		{/snippet}
	</Tooltip>
{/if}
