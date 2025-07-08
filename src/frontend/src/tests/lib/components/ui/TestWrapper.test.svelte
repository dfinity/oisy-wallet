<script lang="ts">
	import type { Component } from 'svelte';
	import CustomPopoverMenu from '$lib/components/ui/CustomPopoverMenu.svelte';

	export let title: string | undefined;
	export let items: Array<{
		logo: Component;
		title: string;
		action: () => void;
		testId?: string;
	}>;
</script>

<CustomPopoverMenu {title} {items}>
	<svelte:fragment slot="trigger" let:toggle let:bindTrigger>
		<button on:click={toggle} use:bindTrigger data-testid="popover-trigger"> Test Trigger </button>
	</svelte:fragment>
</CustomPopoverMenu>
