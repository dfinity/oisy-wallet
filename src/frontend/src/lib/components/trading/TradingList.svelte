<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { OISY_TRADE_ENABLED } from '$env/oisy-trade';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import WithdrawModal from '$lib/components/trading/WithdrawModal.svelte';
	import LimitOrder from '$lib/components/trading/limit-order/LimitOrder.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import {
		OISY_TRADE_LEARN_MORE_URL,
		OISY_TRADE_POLL_INTERVAL_MILLIS
	} from '$lib/constants/oisy-trade.constants';
	import { TRADING_WITHDRAW_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalOisyTradeWithdraw, modalOisyTradeWithdrawData } from '$lib/derived/modal.derived';
	import { oisyTradeWithdrawTokens } from '$lib/derived/oisy-trade.derived';
	import { loadOisyTrade } from '$lib/services/oisy-trade.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OisyTradeWithdrawToken } from '$lib/types/oisy-trade';

	const load = (): Promise<void> => loadOisyTrade({ identity: $authIdentity });

	// Each entry opens the Withdraw flow with its token pre-selected. The polished
	// "My assets" rows that carry this link are built in PR2; this list is the
	// minimal reachable trigger so the flow is usable and testable in isolation.
	const openWithdraw = (withdrawToken: OisyTradeWithdrawToken) =>
		modalStore.openOisyTradeWithdraw({ id: Symbol(), data: withdrawToken });
</script>

{#if OISY_TRADE_ENABLED}
	<IntervalLoader interval={OISY_TRADE_POLL_INTERVAL_MILLIS} onLoad={load} />

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

	<!-- My assets (PR2) renders here once built. -->
	{#each $oisyTradeWithdrawTokens as withdrawToken (withdrawToken.token.id)}
		<div class="mt-4 flex items-center justify-between">
			<span class="flex items-center gap-2 text-sm font-semibold">
				<TokenLogo data={withdrawToken.token} logoSize="xs" />
				{withdrawToken.token.symbol}
			</span>
			<button
				class="text-sm font-semibold text-brand-primary"
				data-tid={TRADING_WITHDRAW_OPEN_BUTTON}
				onclick={() => openWithdraw(withdrawToken)}
			>
				{$i18n.trading.withdraw.open}
			</button>
		</div>
	{/each}

	<!--
		Orders section header. PR4b owns the full Active/History orders list; this
		lightweight placeholder header carries the "+ Limit order" entry point so
		the limit-order modal is reachable and testable in the meantime.
	-->
	<div class="mt-4 flex items-center justify-between">
		<h3 class="text-base font-bold text-primary">{$i18n.trading.orders.title}</h3>
		<LimitOrder>
			{#snippet trigger(open)}
				<button class="text-sm font-medium text-brand-primary" onclick={open} type="button">
					{$i18n.trading.orders.add_limit_order}
				</button>
			{/snippet}
		</LimitOrder>
	</div>

	{#if $modalOisyTradeWithdraw && nonNullish($modalOisyTradeWithdrawData)}
		<WithdrawModal withdrawToken={$modalOisyTradeWithdrawData} />
	{/if}
{:else}
	<EmptyState
		description={$i18n.trading.provider_unavailable.description}
		title={$i18n.trading.provider_unavailable.title}
	/>
{/if}
