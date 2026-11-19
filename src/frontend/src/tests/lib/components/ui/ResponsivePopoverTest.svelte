<script lang="ts">
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';

	interface Props {
		dropdown?: boolean;
		title?: string;
		sheetContentClass?: string;
	}

	const { dropdown = false, title, sheetContentClass }: Props = $props();

	let button = $state<HTMLButtonElement | undefined>();
</script>

<button bind:this={button}>Test</button>

<ResponsivePopover {button} {dropdown} {sheetContentClass} {title} visible>
	{#snippet content()}
		Test content
	{/snippet}
</ResponsivePopover>
