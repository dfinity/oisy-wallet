<script lang="ts">
	import { slide } from 'svelte/transition';
	import TradingAssetRow from '$lib/components/trading/TradingAssetRow.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { oisyTradeAssets } from '$lib/derived/oisy-trade.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import { oisyTradeAssetMatchesFilter } from '$lib/utils/oisy-trade.utils';

	let filteredAssets = $derived(
		$oisyTradeAssets.filter((asset) =>
			oisyTradeAssetMatchesFilter({
				asset,
				filter: $tokenListStore.filter,
				providerLabel: $i18n.trading.text.provider_name
			})
		)
	);
</script>

<div class="flex flex-col gap-2">
	<h3 class="text-base font-bold text-primary">{$i18n.trading.assets.title}</h3>

	{#if $oisyTradeAssets.length === 0}
		<p class="py-2 text-tertiary">{$i18n.trading.assets.empty}</p>
	{:else if filteredAssets.length === 0}
		<p class="py-2 text-tertiary">{$i18n.core.text.no_results}</p>
	{:else}
		<ul class="flex flex-col list-none">
			{#each filteredAssets as asset (asset.token.id)}
				<li transition:slide={SLIDE_PARAMS}>
					<TradingAssetRow {asset} />
				</li>
			{/each}
		</ul>
	{/if}
</div>
