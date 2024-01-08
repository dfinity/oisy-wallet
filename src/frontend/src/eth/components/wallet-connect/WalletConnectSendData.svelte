<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import Copy from '$lib/components/ui/Copy.svelte';

	export let data: string | undefined;
</script>

{#if nonNullish(data)}
	<label for="data" class="font-bold px-4.5">Data:</label>
	<div id="data" class="font-normal mb-4 px-4.5 flex items-center gap-1">
		{shortenWithMiddleEllipsis(data)}<Copy value={data} text="Data copied to clipboard." />
	</div>
{/if}
