<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ConvertAmountDisplay from '$lib/components/convert/ConvertAmountDisplay.svelte';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Vault } from '$lib/types/vaults';

	interface Props {
		amount: OptionAmount;
		estimatedSharesToReceive?: OptionAmount;
		vault: Vault;
	}

	let { vault, amount, estimatedSharesToReceive = $bindable() }: Props = $props();

	let exchange = $derived($exchanges?.[vault.token.id]);

	let assetsPerShare = $derived(
		nonNullish(exchange) && 'assets_per_share' in exchange ? exchange.assets_per_share : undefined
	);

	$effect(() => {
		estimatedSharesToReceive =
			nonNullish(amount) && nonNullish(assetsPerShare)
				? Number(amount) / assetsPerShare
				: undefined;
	});
</script>

{#if nonNullish(estimatedSharesToReceive) && nonNullish(vault.apy)}
	<ModalValue>
		{#snippet label()}
			{$i18n.stake.text.estimated_yearly_yield}
		{/snippet}

		{#snippet mainValue()}
			<ConvertAmountExchange
				amount={(Number(estimatedSharesToReceive ?? 0) * Number(vault.apy)) / 100}
				exchangeRate={vault.token.usdPrice}
			/>
		{/snippet}
	</ModalValue>

	<ConvertAmountDisplay
		amount={estimatedSharesToReceive}
		exchangeRate={vault.token.usdPrice}
		symbol={vault.token.symbol}
	>
		{#snippet label()}
			{$i18n.stake.text.estimated_received}
		{/snippet}
	</ConvertAmountDisplay>
{/if}
