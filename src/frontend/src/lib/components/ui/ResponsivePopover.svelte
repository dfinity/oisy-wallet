<script lang="ts">
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import { Popover } from '@dfinity/gix-components';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		visible: boolean;
		button: HTMLButtonElement | undefined;
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
