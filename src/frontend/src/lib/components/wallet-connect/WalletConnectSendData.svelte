<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import Copy from '$lib/components/ui/Copy.svelte';

	export let data: string | undefined;
</script>

{#if nonNullish(data)}
	<label for="data" class="font-bold px-1.25">Data:</label>
	<div id="data" class="font-normal mb-2 px-1.25 flex items-center gap-1">
		{shortenWithMiddleEllipsis(data)}<Copy value={data} text="Data copied to clipboard." />
	</div>
{/if}
