<script lang="ts">
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';

	interface Props {
		dropdown?: boolean;
	}

	const { dropdown = false }: Props = $props();

	let button = $state<HTMLButtonElement | undefined>();
</script>

<button bind:this={button}>Test</button>

<ResponsivePopover {button} {dropdown} visible>
	{#snippet content()}
		Test content
	{/snippet}
</ResponsivePopover>
