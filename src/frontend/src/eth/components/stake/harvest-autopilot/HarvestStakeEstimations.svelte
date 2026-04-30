<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ConvertAmountDisplay from '$lib/components/convert/ConvertAmountDisplay.svelte';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Vault } from '$lib/types/vaults';
	import { formatToken } from '$lib/utils/format.utils';

	interface Props {
		amount: OptionAmount;
		estimatedSharesToReceive?: OptionAmount;
		vault: Vault;
	}

	let { vault, amount, estimatedSharesToReceive = $bindable() }: Props = $props();

	let {
		token: { id, symbol, decimals, usdPrice },
		apy
	} = $derived(vault);

	let exchange = $derived($exchanges?.[id]);

	let assetsPerShare = $derived(
		nonNullish(exchange) && 'assets_per_share' in exchange ? exchange.assets_per_share : undefined
	);

	$effect(() => {
		if (nonNullish(amount) && nonNullish(assetsPerShare)) {
			const rawShares = Number(amount) / assetsPerShare;
			const sharesBigInt = BigInt(Math.round(rawShares * 10 ** decimals));

			estimatedSharesToReceive = formatToken({
				value: sharesBigInt,
				unitName: decimals,
				displayDecimals: decimals
			});
		} else {
			estimatedSharesToReceive = undefined;
		}
	});
</script>

{#if nonNullish(estimatedSharesToReceive) && nonNullish(vault.apy)}
	<ModalValue>
		{#snippet label()}
			{$i18n.stake.text.estimated_yearly_yield}
		{/snippet}

		{#snippet mainValue()}
			<ConvertAmountExchange
				amount={(Number(estimatedSharesToReceive ?? 0) * Number(apy)) / 100}
				exchangeRate={usdPrice}
			/>
		{/snippet}
	</ModalValue>

	<ConvertAmountDisplay amount={estimatedSharesToReceive} exchangeRate={usdPrice} {symbol}>
		{#snippet label()}
			{$i18n.stake.text.estimated_received}
		{/snippet}
	</ConvertAmountDisplay>
{/if}
