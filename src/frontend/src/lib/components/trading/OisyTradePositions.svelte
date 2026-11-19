<script lang="ts">
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import OisyTradePositionRow from '$lib/components/trading/OisyTradePositionRow.svelte';
	import { oisyTradeAssets, oisyTradeHasAssets } from '$lib/derived/oisy-trade.derived';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<!-- My positions: per-token holdings on the DEX. Hidden entirely when the user
	 has no deposits (the page's Empty state), per the spec. -->
{#if $oisyTradeHasAssets}
	<StakeContentSection>
		{#snippet title()}
			<h4>{$i18n.trading.page.positions}</h4>
		{/snippet}

		{#snippet content()}
			<div class="flex w-full flex-col">
				{#each $oisyTradeAssets as asset (asset.token.id)}
					<OisyTradePositionRow {asset} />
				{/each}
			</div>
		{/snippet}
	</StakeContentSection>
{/if}
