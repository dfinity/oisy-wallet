<script lang="ts">
	import MultiSelectDropdown from '$lib/components/ui/MultiSelectDropdown.svelte';

	interface Props {
		count?: number;
		searchable?: boolean;
		panelWidthClass?: string;
		onToggle?: (visible: boolean) => void;
	}

	let { count = 0, searchable = false, panelWidthClass, onToggle }: Props = $props();
</script>

<MultiSelectDropdown
	ariaLabel="Filter"
	{count}
	{onToggle}
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
