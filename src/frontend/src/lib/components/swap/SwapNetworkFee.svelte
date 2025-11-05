<script lang="ts">
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProviderFee } from '$lib/types/swap';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		networkFee: ProviderFee;
	}

	let { networkFee }: Props = $props();
</script>

<ModalValue>
	{#snippet label()}
		{$i18n.swap.text.included_network_fees}
	{/snippet}

	{#snippet mainValue()}
		<div class="flex flex-col">
			<FeeDisplay
				decimals={networkFee.token.decimals}
				displayExchangeRate={false}
				feeAmount={networkFee.fee}
				symbol={getTokenDisplaySymbol(networkFee.token)}
			/>
		</div>
	{/snippet}
</ModalValue>
