<script lang="ts">
	import { addressStore } from '$lib/stores/address.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { nonNullish } from '@dfinity/utils';
	import Copy from '$lib/components/ui/Copy.svelte';
</script>

<div class="text-off-white mt-8 flex gap-1 opacity-50" style="min-height: 30px">
	{#if nonNullish($addressStore)}
		<output class="break-words">{shortenWithMiddleEllipsis($addressStore ?? '')}</output><Copy
			value={$addressStore ?? ''}
		/>
	{/if}
</div>
