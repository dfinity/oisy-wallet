<script lang="ts">
	import MultiSelectDropdown from '$lib/components/ui/MultiSelectDropdown.svelte';

	interface Props {
		count?: number;
		searchable?: boolean;
	}

	let { count = 0, searchable = false }: Props = $props();
</script>

<MultiSelectDropdown
	ariaLabel="Filter"
	{count}
	searchPlaceholder="Search items"
	{searchable}
	testId="multi-select-dropdown"
	triggerLabel="Filter"
>
	{#snippet panel()}
		<div data-tid="multi-select-dropdown-panel">Panel content</div>
	{/snippet}
</MultiSelectDropdown>
