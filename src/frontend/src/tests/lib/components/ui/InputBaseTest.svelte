<script lang="ts">
	import InputBase from '$lib/components/ui/InputBase.svelte';
	import type { InputProps } from '$lib/types/input';

	let props: InputProps = $props();
</script>

<InputBase {...props}>
	{#snippet label()}
		<span data-tid="label-slot">A label</span>
	{/snippet}
	{#snippet end()}
		<button>End</button>
	{/snippet}
	{#snippet bottom()}
		<span data-tid="bottom-slot">bottom</span>
	{/snippet}
</InputBase>
