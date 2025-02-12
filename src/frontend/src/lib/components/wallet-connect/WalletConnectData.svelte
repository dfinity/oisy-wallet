<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	export let data: string | undefined;
	export let label: string;
</script>

{#if nonNullish(data)}
	<label for="data" class="font-bold px-4.5">{label}:</label>

	<div id="data" class="mb-4 gap-1 font-normal px-4.5 flex items-center">
		{shortenWithMiddleEllipsis({ text: data })}<Copy
			inline
			value={data}
			text={$i18n.wallet_connect.text.raw_copied}
		/>
	</div>
{/if}
