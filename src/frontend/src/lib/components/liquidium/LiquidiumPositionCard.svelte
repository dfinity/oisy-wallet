<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { goto } from '$app/navigation';
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import LiquidiumProviderTag from '$lib/components/liquidium/LiquidiumProviderTag.svelte';
	import LiquidiumWithdrawModal from '$lib/components/liquidium/withdraw/LiquidiumWithdrawModal.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { LIQUIDIUM_ASSET_TOKENS } from '$lib/constants/liquidium.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { modalLiquidiumWithdraw } from '$lib/derived/modal.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { LiquidiumReserve } from '$lib/types/liquidium';
	import { isMobile } from '$lib/utils/device.utils';
	import { formatCurrency, formatStakeApyNumber, formatToken } from '$lib/utils/format.utils';

	interface Props {
		reserve: LiquidiumReserve;
		// 'provider': provider-page row with a Withdraw action (default).
		// 'holdings': Assets → Earning tab row; no action, clicks through to the provider page.
		variant?: 'provider' | 'holdings';
	}

	let { reserve, variant = 'provider' }: Props = $props();

	const modalId = Symbol();

	const goToProvider = () => {
		void goto(AppPath.ProvidersLiquidium);
	};

	let token = $derived(LIQUIDIUM_ASSET_TOKENS[reserve.asset]);

	let suppliedAmount = $derived(
		formatToken({ value: reserve.deposited, unitName: reserve.depositedDecimals })
	);

	// Yearly interest at the current supply APY.
	let currentlyEarning = $derived((reserve.suppliedUsd * reserve.supplyApy) / 100);

	let suppliedValue = $derived(
		formatCurrency({
			value: reserve.suppliedUsd,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);
</script>

{#snippet withdrawAction()}
	<span class="ml-2 flex">
		<Button
			colorStyle="secondary-light"
			onclick={() => modalStore.openLiquidiumWithdraw(modalId)}
			paddingSmall
		>
			{$i18n.liquidium.text.action_withdraw}
		</Button>
	</span>
{/snippet}

{#snippet providerTag()}
	<LiquidiumProviderTag />
{/snippet}

<div class="flex w-full flex-col">
	<LogoButton
		action={variant === 'provider' ? withdrawAction : undefined}
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
			<Badge variant={reserve.supplyApy > 0 ? 'success' : 'default'} width="w-fit">
				{`${formatStakeApyNumber(reserve.supplyApy)}% ${$i18n.liquidium.text.apy_suffix}`}
			</Badge>
		{/snippet}

		{#snippet titleEnd()}
			<span
				class="flex min-w-12 items-center justify-end gap-1 text-sm text-nowrap sm:gap-2 sm:text-base"
			>
				{#if currentlyEarning > 0}
					<EarningYearlyAmount
						showAsSuccess
						showPlusSign
						showWithShortenedLabel
						value={currentlyEarning}
					/>
				{/if}

				<span>{suppliedValue}</span>
			</span>
		{/snippet}

		{#snippet descriptionEnd()}
			<span class="block min-w-12 text-nowrap">
				{suppliedAmount}
				{reserve.asset}
			</span>
		{/snippet}
	</LogoButton>

	<!-- Outside LogoButton's <button> to keep valid HTML. -->
	{#if variant === 'provider' && $modalLiquidiumWithdraw && $modalStore?.id === modalId}
		<LiquidiumWithdrawModal {reserve} />
	{/if}
</div>
