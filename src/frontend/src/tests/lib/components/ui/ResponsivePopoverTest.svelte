<script lang="ts">
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';

	let button = $state<HTMLButtonElement | undefined>();
</script>

<button bind:this={button}>Test</button>

<ResponsivePopover {button} visible>
	{#snippet content()}
		Test content
	{/snippet}
</ResponsivePopover>
