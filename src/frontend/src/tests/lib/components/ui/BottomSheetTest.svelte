<script lang="ts">
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import { nonNullish } from '@dfinity/utils';

	interface Props {
		visible: boolean;
		content: () => string;
		footer?: () => string;
	}

	let { visible = $bindable(), content, footer }: Props = $props();

	export { visible };
</script>

<BottomSheet bind:visible>
	{#snippet content()}
		{content()}
	{/snippet}
	{#snippet footer()}
		{#if nonNullish(footer)}
			{footer()}
		{/if}
	{/snippet}
</BottomSheet>
