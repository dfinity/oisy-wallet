<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { OISY_TRADE_ENABLED } from '$env/oisy-trade';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import TradingAssets from '$lib/components/trading/TradingAssets.svelte';
	import TradingDepositModal from '$lib/components/trading/TradingDepositModal.svelte';
	import TradingOnboarding from '$lib/components/trading/TradingOnboarding.svelte';
	import TradingOrders from '$lib/components/trading/TradingOrders.svelte';
	import WithdrawModal from '$lib/components/trading/WithdrawModal.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import {
		OISY_TRADE_LEARN_MORE_URL,
		OISY_TRADE_POLL_INTERVAL_MILLIS
	} from '$lib/constants/oisy-trade.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		modalOisyTradeWithdraw,
		modalOisyTradeWithdrawData,
		modalTradingDeposit
	} from '$lib/derived/modal.derived';
	import { oisyTradeHasAssets } from '$lib/derived/oisy-trade.derived';
	import { loadOisyTrade } from '$lib/services/oisy-trade.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OisyTradeAsset } from '$lib/types/oisy-trade';

	const load = (): Promise<void> => loadOisyTrade({ identity: $authIdentity });

	const modalId = Symbol();
	const openDeposit = () => modalStore.openTradingDeposit(modalId);

	// Opens the Withdraw flow with the chosen My-assets holding pre-selected. The
	// asset already carries the free/reserved split the modal needs.
	const openWithdraw = ({ token, free, reserved }: OisyTradeAsset) =>
		modalStore.openOisyTradeWithdraw({ id: Symbol(), data: { token, free, reserved } });
</script>

{#if OISY_TRADE_ENABLED}
	<IntervalLoader interval={OISY_TRADE_POLL_INTERVAL_MILLIS} onLoad={load} />

	{#if $oisyTradeHasAssets}
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-2">
				<p class="text-sm text-tertiary">{$i18n.trading.text.intro}</p>
				<ExternalLink
					ariaLabel={$i18n.trading.text.learn_more}
					color="blue"
					href={OISY_TRADE_LEARN_MORE_URL}
					iconVisible={false}
					inline
				>
					{$i18n.trading.text.learn_more}
				</ExternalLink>
			</div>

			<TradingAssets onDeposit={openDeposit} onWithdraw={openWithdraw} />

			<TradingOrders />
		</div>
	{:else}
		<TradingOnboarding onDeposit={openDeposit} />
	{/if}

	{#if $modalTradingDeposit && $modalStore?.id === modalId}
		<TradingDepositModal />
	{/if}

	{#if $modalOisyTradeWithdraw && nonNullish($modalOisyTradeWithdrawData)}
		<WithdrawModal withdrawToken={$modalOisyTradeWithdrawData} />
	{/if}
{:else}
	<EmptyState
		description={$i18n.trading.provider_unavailable.description}
		title={$i18n.trading.provider_unavailable.title}
	/>
{/if}
