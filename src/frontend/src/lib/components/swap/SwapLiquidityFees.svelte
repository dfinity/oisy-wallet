<script lang="ts">
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProviderFee } from '$lib/types/swap';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	export let liquidityFees: ProviderFee[];
</script>

<ModalValue labelStyleClass="self-start">
	{#snippet label()}
		{$i18n.swap.text.included_liquidity_fees}
	{/snippet}

	{#snippet mainValue()}
		<div class="flex flex-col">
			{#each liquidityFees as { fee, token } (token.id)}
				<FeeDisplay
					decimals={token.decimals}
					displayExchangeRate={false}
					feeAmount={fee}
					symbol={getTokenDisplaySymbol(token)}
				/>
			{/each}
		</div>
	{/snippet}
</ModalValue>
