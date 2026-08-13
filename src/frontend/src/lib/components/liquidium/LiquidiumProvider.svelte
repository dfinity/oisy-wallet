<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { LEND_BORROW_ENABLED } from '$env/lend-borrow';
	import { LIQUIDIUM_ENABLED } from '$env/liquidium';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import LiquidiumBorrowedRow from '$lib/components/liquidium/LiquidiumBorrowedRow.svelte';
	import LiquidiumInfoBox from '$lib/components/liquidium/LiquidiumInfoBox.svelte';
	import LiquidiumMarketCard from '$lib/components/liquidium/LiquidiumMarketCard.svelte';
	import LiquidiumProviderHero from '$lib/components/liquidium/LiquidiumProviderHero.svelte';
	import LiquidiumSuppliedRow from '$lib/components/liquidium/LiquidiumSuppliedRow.svelte';
	import LiquidiumRepayModal from '$lib/components/liquidium/repay/LiquidiumRepayModal.svelte';
	import LiquidiumWithdrawModal from '$lib/components/liquidium/withdraw/LiquidiumWithdrawModal.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { lendBorrowProvidersConfig } from '$lib/config/lend-borrow.config';
	import { ZERO } from '$lib/constants/app.constants';
	import { LIQUIDIUM_POLL_INTERVAL_MILLIS } from '$lib/constants/liquidium.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { liquidiumMarkets, liquidiumPortfolio } from '$lib/derived/liquidium.derived';
	import { modalLiquidiumRepay, modalLiquidiumWithdraw } from '$lib/derived/modal.derived';
	import { loadLiquidium } from '$lib/services/liquidium.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { LendBorrowProvider } from '$lib/types/lend-borrow';
	import { replaceOisyPlaceholders, resolveText } from '$lib/utils/i18n.utils';

	const liquidium = lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM];

	// Section-header actions launch neutral (token-less) modals that open on their picker.
	const withdrawModalId = Symbol();
	const repayModalId = Symbol();

	let infoBoxRef = $state<HTMLElement | undefined>();

	let reserves = $derived($liquidiumPortfolio?.reserves ?? []);

	// Supplies and borrowings render in separate boxes.
	let supplyReserves = $derived(reserves.filter(({ deposited }) => deposited > ZERO));
	let borrowReserves = $derived(reserves.filter(({ borrowed }) => borrowed > ZERO));

	const load = (): Promise<void> =>
		loadLiquidium({ identity: $authIdentity, ethAddress: $ethAddress });

	onMount(() => {
		if (!LEND_BORROW_ENABLED) {
			goto(AppPath.Earn);
		}
	});
</script>

{#if LEND_BORROW_ENABLED}
	{#if LIQUIDIUM_ENABLED}
		<IntervalLoader interval={LIQUIDIUM_POLL_INTERVAL_MILLIS} onLoad={load} />
	{/if}

	<div class="flex flex-col gap-6 pb-6">
		<LiquidiumProviderHero
			logo={liquidium.logo}
			onLearnMore={() => infoBoxRef?.scrollIntoView({ behavior: 'smooth' })}
			pageDescription={replaceOisyPlaceholders(
				resolveText({ i18n: $i18n, path: liquidium.descriptionKey })
			)}
			pageTitle={liquidium.name}
			portfolio={$liquidiumPortfolio}
			showSummary={LIQUIDIUM_ENABLED}
		/>

		{#if LIQUIDIUM_ENABLED && supplyReserves.length > 0}
			<StakeContentSection>
				{#snippet title()}
					<h4>{$i18n.liquidium.text.supplied}</h4>
				{/snippet}

				{#snippet action()}
					<Button
						colorStyle="secondary-light"
						onclick={() => modalStore.openLiquidiumWithdraw(withdrawModalId)}
						paddingSmall
					>
						{$i18n.liquidium.text.action_withdraw}
					</Button>
				{/snippet}

				{#snippet content()}
					<div class="flex w-full flex-col">
						{#each supplyReserves as reserve (reserve.poolId)}
							<LiquidiumSuppliedRow {reserve} />
						{/each}
					</div>
				{/snippet}
			</StakeContentSection>

			<!-- Neutral launch: no reserve prop, so it opens on the select-token step. -->
			{#if $modalLiquidiumWithdraw && $modalStore?.id === withdrawModalId}
				<LiquidiumWithdrawModal />
			{/if}
		{/if}

		{#if LIQUIDIUM_ENABLED && borrowReserves.length > 0}
			<StakeContentSection>
				{#snippet title()}
					<h4>{$i18n.liquidium.text.borrowed}</h4>
				{/snippet}

				{#snippet action()}
					<Button
						colorStyle="success-light"
						onclick={() => modalStore.openLiquidiumRepay(repayModalId)}
						paddingSmall
					>
						{$i18n.liquidium.text.action_repay}
					</Button>
				{/snippet}

				{#snippet content()}
					<div class="flex w-full flex-col">
						{#each borrowReserves as reserve (reserve.poolId)}
							<LiquidiumBorrowedRow {reserve} />
						{/each}
					</div>
				{/snippet}
			</StakeContentSection>

			<!-- Neutral launch: no reserve prop, so it opens on the select-token step. -->
			{#if $modalLiquidiumRepay && $modalStore?.id === repayModalId}
				<LiquidiumRepayModal />
			{/if}
		{/if}

		{#if LIQUIDIUM_ENABLED && $liquidiumMarkets.length > 0}
			<StakeContentSection>
				{#snippet title()}
					<h4>{$i18n.liquidium.text.markets}</h4>
				{/snippet}

				{#snippet content()}
					<div class="flex w-full flex-col">
						{#each $liquidiumMarkets as market (`${market.poolId}-${market.chain}`)}
							<LiquidiumMarketCard {market} />
						{/each}
					</div>
				{/snippet}
			</StakeContentSection>
		{/if}

		<div bind:this={infoBoxRef}>
			<LiquidiumInfoBox />
		</div>
	</div>
{/if}
