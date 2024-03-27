<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let data: string | undefined;
</script>

{#if nonNullish(data)}
	<label for="data" class="font-bold px-4.5">{$i18n.wallet_connect.text.hex_data}:</label>
	<div id="data" class="font-normal mb-4 px-4.5 flex items-center gap-1">
		{shortenWithMiddleEllipsis(data)}<Copy
			inline
			value={data}
			text={$i18n.wallet_connect.text.raw_copied}
		/>
	</div>
{/if}
