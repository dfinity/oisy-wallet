<script lang="ts">
	import type { Snippet } from 'svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import Popover from '$lib/components/ui/Popover.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';

	interface Props {
		visible: boolean;
		button?: HTMLButtonElement;
		content: Snippet;
		ariaLabel?: string;
		direction?: 'rtl' | 'ltr';
	}

	let { visible = $bindable(), button, content, ariaLabel, direction = 'rtl' }: Props = $props();
</script>

<!-- The ranges must not overlap: at a width where both render, the popover mounts under the
visible sheet yet counts as the topmost overlay, and pulls keyboard focus away from the sheet. -->
<Responsive up="md">
	<Popover anchor={button} {ariaLabel} {direction} invisibleBackdrop bind:visible>
		{@render content()}
	</Popover>
</Responsive>
<Responsive down="sm">
	<BottomSheet
		ariaLabel={ariaLabel ?? button?.getAttribute('aria-label') ?? undefined}
		{content}
		bind:visible
	>
		{#snippet footer()}
			<ButtonDone onclick={() => (visible = false)} variant="secondary-light" />
		{/snippet}
	</BottomSheet>
</Responsive>
