<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import LiquidiumBorrowModal from '$lib/components/liquidium/borrow/LiquidiumBorrowModal.svelte';
	import LiquidiumSupplyModal from '$lib/components/liquidium/supply/LiquidiumSupplyModal.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { LIQUIDIUM_ASSET_TOKENS } from '$lib/constants/liquidium.constants';
	import { liquidiumPortfolio } from '$lib/derived/liquidium.derived';
	import { modalLiquidiumBorrow, modalLiquidiumSupply } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { LiquidiumMarket } from '$lib/types/liquidium';
	import { isMobile } from '$lib/utils/device.utils';
	import { formatStakeApyNumber } from '$lib/utils/format.utils';

	interface Props {
		market: LiquidiumMarket;
	}

	let { market }: Props = $props();

	// Per-card id so only the clicked card's modal opens.
	const modalId = Symbol();

	let token = $derived(LIQUIDIUM_ASSET_TOKENS[market.asset]);

	// Can't borrow a token you supplied (withdraw instead).
	let isSupplied = $derived(
		($liquidiumPortfolio?.reserves ?? []).some(
			({ poolId, deposited }) => poolId === market.poolId && deposited > ZERO
		)
	);

	// Can't supply a token you borrowed (repay instead).
	let isBorrowed = $derived(
		($liquidiumPortfolio?.reserves ?? []).some(
			({ poolId, borrowed }) => poolId === market.poolId && borrowed > ZERO
		)
	);

	// Needs borrowing power and an unsupplied token; kept disabled (not hidden) otherwise.
	let canBorrow = $derived(
		nonNullish($liquidiumPortfolio) && $liquidiumPortfolio.availableBorrowsUsd > 0 && !isSupplied
	);
</script>

<div class="flex w-full flex-col">
	<LogoButton hover={false}>
		{#snippet logo()}
			<span class="mr-2 flex">
				{#if nonNullish(token)}
					<TokenLogo
						badge={{ type: 'network' }}
						color="white"
						data={token}
						logoSize={isMobile() ? 'sm' : 'lg'}
					/>
				{/if}
			</span>
		{/snippet}

		{#snippet title()}
			<span class="text-sm sm:text-lg">{market.asset}</span>
		{/snippet}

		{#snippet subtitle()}
			{#if !market.available}
				<span
					class="ml-2 rounded-full bg-warning-subtle-20 px-2 py-0.5 text-xs text-warning-primary"
				>
					{$i18n.liquidium.text.coming_soon}
				</span>
			{/if}
		{/snippet}

		{#snippet description()}
			<span>
				{$i18n.liquidium.text.supply_label}
				<span class="text-success-primary">{formatStakeApyNumber(market.supplyApy)}%</span>
				· {$i18n.liquidium.text.borrow_label}
				<span class="text-warning-primary">{formatStakeApyNumber(market.borrowApy)}%</span>
			</span>
		{/snippet}

		{#snippet action()}
			{#if market.available}
				<div class="flex gap-2">
					<Button
						colorStyle="secondary"
						disabled={!canBorrow}
						onclick={() => modalStore.openLiquidiumBorrow(modalId)}
						paddingSmall
					>
						{$i18n.liquidium.text.action_borrow}
					</Button>

					<Button
						disabled={isBorrowed}
						onclick={() => modalStore.openLiquidiumSupply(modalId)}
						paddingSmall
					>
						{$i18n.liquidium.text.action_supply}
					</Button>
				</div>
			{/if}
		{/snippet}
	</LogoButton>

	<!-- Sibling of LogoButton, not inside its <button> — avoids inheriting button
		styles and keeps valid HTML. -->
	{#if market.available && $modalLiquidiumSupply && $modalStore?.id === modalId}
		<LiquidiumSupplyModal {market} />
	{/if}

	{#if market.available && $modalLiquidiumBorrow && $modalStore?.id === modalId}
		<LiquidiumBorrowModal {market} />
	{/if}
</div>
