<script lang="ts">
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import TradingAssetRow from '$lib/components/trading/TradingAssetRow.svelte';
	import { TRADING_ASSETS_DEPOSIT_BUTTON } from '$lib/constants/test-ids.constants';
	import { oisyTradeAssets } from '$lib/derived/oisy-trade.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OisyTradeAsset } from '$lib/types/oisy-trade';

	interface Props {
		onDeposit: () => void;
		// Wired to the Withdraw modal in PR3.
		onWithdraw?: (asset: OisyTradeAsset) => void;
	}

	let { onDeposit, onWithdraw }: Props = $props();
</script>

<StakeContentSection>
	{#snippet title()}
		<h3 class="w-full">{$i18n.trading.assets.title}</h3>
	{/snippet}

	{#snippet action()}
		<button
			class="font-semibold whitespace-nowrap text-brand-primary"
			data-tid={TRADING_ASSETS_DEPOSIT_BUTTON}
			onclick={onDeposit}
		>
			{$i18n.trading.assets.deposit}
		</button>
	{/snippet}

	{#snippet content()}
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
	{/snippet}
</StakeContentSection>
