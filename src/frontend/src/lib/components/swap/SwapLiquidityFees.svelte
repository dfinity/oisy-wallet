<script lang="ts">
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProviderFee } from '$lib/types/swap';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	export let liquidityFees: ProviderFee[];
</script>

<ModalValue labelStyleClass="self-start">
	<svelte:fragment slot="label">{$i18n.swap.text.included_liquidity_fees}</svelte:fragment>

	<div slot="main-value" class="flex flex-col">
		{#each liquidityFees as { fee, token } (token.id)}
			<FeeDisplay
				feeAmount={fee}
				symbol={getTokenDisplaySymbol(token)}
				decimals={token.decimals}
				displayExchangeRate={false}
			/>
		{/each}
	</div>
</ModalValue>
