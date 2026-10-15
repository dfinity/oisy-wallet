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

<Responsive up="sm">
	<Popover anchor={button} {direction} {ariaLabel} invisibleBackdrop bind:visible>
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
