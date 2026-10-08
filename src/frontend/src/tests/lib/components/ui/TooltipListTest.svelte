<script lang="ts">
	import Tooltip from '$lib/components/ui/Tooltip.svelte';

	interface Props {
		list: { text: string; id: string }[];
	}

	let { list }: Props = $props();
</script>

{#each list as { text, id } (id)}
	<Tooltip {id} {text}>
		<p>content</p>
	</Tooltip>
{/each}
