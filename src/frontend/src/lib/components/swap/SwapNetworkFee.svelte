<script lang="ts">
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProviderFee } from '$lib/types/swap';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	export let networkFee: ProviderFee;
</script>

<ModalValue>
	<svelte:fragment slot="label">{$i18n.swap.text.included_network_fees}</svelte:fragment>

	<div slot="main-value" class="flex flex-col">
		<FeeDisplay
			feeAmount={networkFee.fee}
			symbol={getTokenDisplaySymbol(networkFee.token)}
			decimals={networkFee.token.decimals}
			displayExchangeRate={false}
		/>
	</div>
</ModalValue>
