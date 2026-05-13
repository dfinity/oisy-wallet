<script lang="ts">
	import MultiSelectDropdown from '$lib/components/ui/MultiSelectDropdown.svelte';

	interface Props {
		count?: number;
		searchable?: boolean;
		panelWidthClass?: string;
	}

	let { count = 0, searchable = false, panelWidthClass }: Props = $props();
</script>

<MultiSelectDropdown
	ariaLabel="Filter"
	{count}
	{panelWidthClass}
	searchPlaceholder="Search items"
	{searchable}
	testId="multi-select-dropdown"
	triggerLabel="Filter"
>
	{#snippet panel()}
		<div data-tid="multi-select-dropdown-panel">Panel content</div>
	{/snippet}
</MultiSelectDropdown>
