<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		data: string | undefined;
		label: string;
	}


	let { data, label }: Props = $props();
</script>

{#if nonNullish(data)}
	<label class="font-bold" for="data">{label}:</label>

	<div id="data" class="mb-4 flex items-center gap-1 font-normal">
		{shortenWithMiddleEllipsis({ text: data })}<Copy
			inline
			text={$i18n.wallet_connect.text.raw_copied}
			value={data}
		/>
	</div>
{/if}
