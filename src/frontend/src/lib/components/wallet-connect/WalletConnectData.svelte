<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';

	interface Props {
		data: string | undefined;
		label: string;
	}

	let { data, label: labelStr }: Props = $props();
</script>

{#if nonNullish(data)}
	<ModalValue>
		{#snippet label()}{labelStr}{/snippet}

		{#snippet mainValue()}
			<div id="data" class="mb-4 flex items-center gap-1 font-normal">
				{shortenWithMiddleEllipsis({ text: data })}<Copy
					inline
					text={$i18n.wallet_connect.text.raw_copied}
					value={data}
				/>
			</div>
		{/snippet}
	</ModalValue>
{/if}
