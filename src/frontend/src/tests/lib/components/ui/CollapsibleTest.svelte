<script lang="ts">
	import Collapsible from '$lib/components/ui/Collapsible.svelte';

	interface Props {
		onSubmit: () => void;
	}

	let { onSubmit }: Props = $props();
</script>

<form onsubmit={onSubmit}>
	<Collapsible>
		{#snippet header()}
			<span>header</span>
		{/snippet}

		<span>content</span>
	</Collapsible>
</form>
