<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { OISY_TRADE_ENABLED } from '$env/oisy-trade';
	import { anyTradingProviderEnabled } from '$env/trading';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import OisyTradeActiveOrders from '$lib/components/trading/OisyTradeActiveOrders.svelte';
	import OisyTradeInfoBox from '$lib/components/trading/OisyTradeInfoBox.svelte';
	import OisyTradeOrderHistory from '$lib/components/trading/OisyTradeOrderHistory.svelte';
	import OisyTradePositions from '$lib/components/trading/OisyTradePositions.svelte';
	import OisyTradeProviderHero from '$lib/components/trading/OisyTradeProviderHero.svelte';
	import TradingDepositModal from '$lib/components/trading/TradingDepositModal.svelte';
	import TradingOrderDetailModal from '$lib/components/trading/TradingOrderDetailModal.svelte';
	import WithdrawModal from '$lib/components/trading/WithdrawModal.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { OISY_TRADE_POLL_INTERVAL_MILLIS } from '$lib/constants/oisy-trade.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		modalOisyTradeOrderDetail,
		modalOisyTradeOrderDetailData,
		modalOisyTradeWithdraw,
		modalOisyTradeWithdrawData,
		modalTradingDeposit
	} from '$lib/derived/modal.derived';
	import { loadOisyTrade } from '$lib/services/oisy-trade.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	const load = (): Promise<void> => loadOisyTrade({ identity: $authIdentity });

	const depositModalId = Symbol();
	const openDeposit = () => modalStore.openTradingDeposit(depositModalId);

	// Open the withdraw flow with no pre-selected token — the modal starts on its
	// token picker (see WithdrawModal); enabled from the hero only once deposited.
	const withdrawModalId = Symbol();
	const openWithdraw = () => modalStore.openOisyTradeWithdraw({ id: withdrawModalId });

	// The whole surface is gated by the trading providers; with none enabled the
	// route shouldn't be reachable, so send stragglers back to the wallet.
	onMount(() => {
		if (!anyTradingProviderEnabled) {
			goto(AppPath.Tokens);
		}
	});
</script>

{#if anyTradingProviderEnabled}
	<div class="flex flex-col gap-6 pb-6">
		{#if OISY_TRADE_ENABLED}
			<IntervalLoader interval={OISY_TRADE_POLL_INTERVAL_MILLIS} onLoad={load} />

			<OisyTradeProviderHero onDeposit={openDeposit} onWithdraw={openWithdraw} />

			<OisyTradePositions />

			<OisyTradeActiveOrders />

			<OisyTradeOrderHistory />

			<OisyTradeInfoBox />

			{#if $modalTradingDeposit && $modalStore?.id === depositModalId}
				<TradingDepositModal />
			{/if}

			{#if $modalOisyTradeOrderDetail && nonNullish($modalOisyTradeOrderDetailData)}
				<TradingOrderDetailModal order={$modalOisyTradeOrderDetailData} />
			{/if}

			{#if $modalOisyTradeWithdraw && $modalStore?.id === withdrawModalId}
				<WithdrawModal withdrawToken={$modalOisyTradeWithdrawData} />
			{/if}
		{:else}
			<EmptyState
				description={$i18n.trading.provider_unavailable.description}
				title={$i18n.trading.provider_unavailable.title}
			/>
		{/if}
	</div>
{/if}
