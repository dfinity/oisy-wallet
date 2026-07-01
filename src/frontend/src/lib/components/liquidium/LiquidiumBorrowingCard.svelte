<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { goto } from '$app/navigation';
	import LiquidiumProviderTag from '$lib/components/liquidium/LiquidiumProviderTag.svelte';
	import LiquidiumRepayModal from '$lib/components/liquidium/repay/LiquidiumRepayModal.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { LIQUIDIUM_ASSET_TOKENS } from '$lib/constants/liquidium.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { modalLiquidiumRepay } from '$lib/derived/modal.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { LiquidiumReserve } from '$lib/types/liquidium';
	import { isMobile } from '$lib/utils/device.utils';
	import { formatCurrency, formatStakeApyNumber, formatToken } from '$lib/utils/format.utils';

	interface Props {
		reserve: LiquidiumReserve;
		// 'provider': provider-page row with a Repay action (default).
		// 'holdings': Assets → Borrowings tab row; no action, clicks through to the provider page.
		variant?: 'provider' | 'holdings';
	}

	let { reserve, variant = 'provider' }: Props = $props();

	const modalId = Symbol();

	const goToProvider = () => {
		void goto(AppPath.ProvidersLiquidium);
	};

	let token = $derived(LIQUIDIUM_ASSET_TOKENS[reserve.asset]);

	let borrowedAmount = $derived(
		formatToken({ value: reserve.borrowed, unitName: reserve.borrowedDecimals })
	);

	let borrowedValue = $derived(
		formatCurrency({
			value: reserve.borrowedUsd,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);
</script>

{#snippet repayAction()}
	<span class="ml-2 flex">
		<Button
			colorStyle="secondary-light"
			onclick={() => modalStore.openLiquidiumRepay(modalId)}
			paddingSmall
		>
			{$i18n.liquidium.text.action_repay}
		</Button>
	</span>
{/snippet}

{#snippet providerTag()}
	<LiquidiumProviderTag />
{/snippet}

<div class="flex w-full flex-col">
	<LogoButton
		action={variant === 'provider' ? repayAction : undefined}
		hover={variant === 'holdings'}
		onClick={variant === 'holdings' ? goToProvider : undefined}
		subtitle={variant === 'holdings' ? providerTag : undefined}
	>
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
			<span class="text-sm sm:text-lg">{reserve.asset}</span>
		{/snippet}

		{#snippet description()}
			<Badge variant="warning" width="w-fit">
				{`${formatStakeApyNumber(reserve.borrowApy)}% ${$i18n.liquidium.text.borrow_rate}`}
			</Badge>
		{/snippet}

		{#snippet titleEnd()}
			<span class="block min-w-12 text-right text-sm text-nowrap sm:text-base">
				−{borrowedValue}
			</span>
		{/snippet}

		{#snippet descriptionEnd()}
			<span class="block min-w-12 text-nowrap">
				{borrowedAmount}
				{reserve.asset}
			</span>
		{/snippet}
	</LogoButton>

	<!-- Outside LogoButton's <button> to keep valid HTML. -->
	{#if variant === 'provider' && $modalLiquidiumRepay && $modalStore?.id === modalId}
		<LiquidiumRepayModal {reserve} />
	{/if}
</div>
