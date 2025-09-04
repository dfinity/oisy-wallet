<script lang="ts">
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';

	let button: HTMLButtonElement | undefined = $state(undefined);
</script>

<button bind:this={button}>Test</button>

<ResponsivePopover {button} visible>
	{#snippet content()}
		Test content
	{/snippet}
</ResponsivePopover>
