<script lang="ts">
	import ListItemCheckbox from '$lib/components/common/ListItemCheckbox.svelte';

	interface Props {
		label: string;
		checked: boolean;
		onChange: () => void;
	}

	const { label, ...props }: Props = $props();
</script>

<ul>
	<ListItemCheckbox inputId="list-item-checkbox-test" {...props}>
		<span>{label}</span>
	</ListItemCheckbox>
</ul>
