<script lang="ts">
	import TradingAssetRow from '$lib/components/trading/TradingAssetRow.svelte';
	import { TRADING_ASSETS_DEPOSIT_BUTTON } from '$lib/constants/test-ids.constants';
	import { oisyTradeAssets } from '$lib/derived/oisy-trade.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OisyTradeAsset } from '$lib/types/oisy-trade';

	interface Props {
		onDeposit: () => void;
		onWithdraw?: (asset: OisyTradeAsset) => void;
	}

	let { onDeposit, onWithdraw }: Props = $props();
</script>

<!-- Mirrors the Orders section: a plain section header (title + action) over a
	list of token rows, instead of the boxed StakeContentSection. -->
<div class="flex flex-col gap-2">
	<div class="flex items-center justify-between">
		<h3 class="text-base font-bold text-primary">{$i18n.trading.assets.title}</h3>
		<button
			class="text-sm font-medium text-brand-primary"
			data-tid={TRADING_ASSETS_DEPOSIT_BUTTON}
			onclick={onDeposit}
			type="button"
		>
			{$i18n.trading.assets.deposit}
		</button>
	</div>

	{#if $oisyTradeAssets.length === 0}
		<p class="py-2 text-tertiary">{$i18n.trading.assets.empty}</p>
	{:else}
		<ul class="flex flex-col">
			{#each $oisyTradeAssets as asset (asset.token.id)}
				<li>
					<TradingAssetRow {asset} {onWithdraw} />
				</li>
			{/each}
		</ul>
	{/if}
</div>
