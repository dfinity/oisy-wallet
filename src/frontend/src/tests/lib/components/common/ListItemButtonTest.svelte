<script lang="ts">
	import ListItemButton from '$lib/components/common/ListItemButton.svelte';

	interface Props {
		children: string;
		onclick: () => void;
		selected?: boolean;
		selectable?: boolean;
		contentFullWidth?: boolean;
		testId?: string;
	}

	const { children: label, ...props }: Props = $props();
</script>

<ListItemButton {...props}>
	{label}
</ListItemButton>
