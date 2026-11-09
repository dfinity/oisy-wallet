<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';

	interface Props {
		visible: boolean;
		contentTest: string;
		footerTest?: string;
		title?: string;
	}

	let { visible = $bindable(), contentTest, footerTest, title }: Props = $props();

	export { visible };
</script>

<BottomSheet {title} bind:visible>
	{#snippet content()}
		{contentTest}
	{/snippet}
	{#snippet footer()}
		{#if nonNullish(footerTest)}
			{footerTest}
		{/if}
	{/snippet}
</BottomSheet>
