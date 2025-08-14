<script lang="ts">
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import { nonNullish } from '@dfinity/utils';

	interface Props {
		visible: boolean;
		contentTest: string;
		footerTest?: string;
	}

	let { visible = $bindable(), contentTest, footerTest }: Props = $props();

	export { visible };
</script>

<BottomSheet bind:visible>
	{#snippet content()}
		{contentTest}
	{/snippet}
	{#snippet footer()}
		{#if nonNullish(footerTest)}
			{footerTest}
		{/if}
	{/snippet}
</BottomSheet>
