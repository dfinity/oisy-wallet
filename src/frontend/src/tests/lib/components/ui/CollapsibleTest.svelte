<script lang="ts">
	import Collapsible from '$lib/components/ui/Collapsible.svelte';

	interface Props {
		onSubmit: () => void;
		disabled?: boolean;
		initiallyExpanded?: boolean;
	}

	let { onSubmit, disabled = false, initiallyExpanded = false }: Props = $props();
</script>

<form onsubmit={onSubmit}>
	<Collapsible {disabled} {initiallyExpanded}>
		{#snippet header()}
			<span>header</span>
		{/snippet}

		<span>content</span>
	</Collapsible>
</form>
