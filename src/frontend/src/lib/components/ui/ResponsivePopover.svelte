<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';

	interface Props {
		visible: boolean;
		button?: HTMLButtonElement;
		content: Snippet;
	}

	let { visible = $bindable(), button, content }: Props = $props();
</script>

<Responsive up="sm">
	<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
		{@render content()}
	</Popover>
</Responsive>
<Responsive down="sm">
	<BottomSheet {content} bind:visible>
		{#snippet footer()}
			<ButtonDone variant="secondary-light" onclick={() => (visible = false)} />
		{/snippet}
	</BottomSheet>
</Responsive>
