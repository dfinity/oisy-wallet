<script lang="ts">
	import { setContext } from 'svelte';
	import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
	import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
	import LandingPreviewFrame from '$lib/components/auth/LandingPreviewFrame.svelte';
	import LandingSmartSwapCell from '$lib/components/auth/LandingSmartSwapCell.svelte';
	import IconArrowUpDown from '$lib/components/icons/lucide/IconArrowUpDown.svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import IconSettings from '$lib/components/icons/lucide/IconSettings.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import TokenInputBalance from '$lib/components/tokens/TokenInputBalance.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import ValueDifference from '$lib/components/ui/ValueDifference.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { COLORED_NETWORK_LOGOS_CONTEXT_KEY } from '$lib/stores/colored-network-logos.store';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	setContext(COLORED_NETWORK_LOGOS_CONTEXT_KEY, true);

	// Example quotes in hundredths of a USDC for the same 0.05 BTC input.
	const BEST_QUOTE = 479_520;
	const LOWEST_QUOTE = 473_880;
	const PAY = { token: BTC_MAINNET_TOKEN, amount: '0.05', exchangeRate: 96_154.86 };
	const RECEIVE = {
		token: USDC_TOKEN,
		amount: (BEST_QUOTE / 100).toFixed(2),
		exchangeRate: 1,
		balance: 1_350_000_000n
	};
	const MAX_BTC = '0.41998';
	const PAY_VALUE_USD = Number(PAY.amount) * PAY.exchangeRate;
	const VALUE_DIFFERENCE_PCT = ((BEST_QUOTE / 100 - PAY_VALUE_USD) / PAY_VALUE_USD) * 100;
	const NETWORK_FEE_BTC = '0.00001454';
	const NETWORK_FEE_USD = 1.4;

	const quoteFormat = $derived(
		new Intl.NumberFormat($currentLanguage, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
	);
	const gain = $derived(
		`${quoteFormat.format((BEST_QUOTE - LOWEST_QUOTE) / 100)} ${USDC_TOKEN.symbol}`
	);
	const previewLabel = $derived(
		replacePlaceholders($i18n.auth.landing.swap_preview, {
			$sourceAmount: PAY.amount,
			$receiveAmount: quoteFormat.format(BEST_QUOTE / 100),
			$gain: gain
		})
	);

	let networkFee = $derived(
		formatCurrency({
			value: NETWORK_FEE_USD,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);

	const noop = () => {};
</script>

<LandingPreviewFrame label={previewLabel}>
	<!-- The modal header: title centred, slippage and close on the right. -->
	<div class="relative flex items-center justify-end border-b border-tertiary px-4 pt-6 pb-4">
		<span
			class="absolute left-1/2 -translate-x-1/2 text-[23px] leading-[30px] font-bold text-primary"
		>
			{$i18n.swap.text.swap}
		</span>
		<span
			class="me-3 flex items-center gap-1 rounded-md bg-brand-subtle-20 px-2 py-0.5 text-sm font-bold whitespace-nowrap text-primary"
		>
			1.5%
			<IconSettings size="16" />
		</span>
		<span class="flex text-primary"><IconClose size="24" /></span>
	</div>

	<div class="flex flex-col p-4 sm:p-6">
		<div class="mb-2">
			<TokenInput
				amount={PAY.amount}
				exchangeRate={PAY.exchangeRate}
				showTokenNetwork
				token={PAY.token}
			>
				{#snippet title()}{$i18n.tokens.text.source_token_title}{/snippet}

				{#snippet amountInfo()}
					<div class="text-tertiary">
						<TokenInputAmountExchange
							amount={PAY.amount}
							exchangeRate={PAY.exchangeRate}
							token={PAY.token}
						/>
					</div>
				{/snippet}

				{#snippet balance()}
					<!-- MaxBalanceButton's look; the real one computes the max from a live fee. -->
					<span class="font-semibold text-brand-primary-alt">
						{$i18n.core.text.max}: {MAX_BTC}
						{PAY.token.symbol}
					</span>
				{/snippet}
			</TokenInput>
		</div>

		<div class="relative">
			<div
				class="absolute inset-0 z-1 m-auto grid size-9 place-items-center rounded-lg border border-secondary bg-tertiary text-primary shadow-sm"
			>
				<IconArrowUpDown size="14" />
			</div>
		</div>

		<div class="mb-2">
			<TokenInput
				amount={RECEIVE.amount}
				disabled
				exchangeRate={RECEIVE.exchangeRate}
				showTokenNetwork
				token={RECEIVE.token}
			>
				{#snippet title()}{$i18n.tokens.text.destination_token_title}{/snippet}

				{#snippet amountInfo()}
					<div class="flex gap-3 text-tertiary">
						<TokenInputAmountExchange
							amount={RECEIVE.amount}
							exchangeRate={RECEIVE.exchangeRate}
							token={RECEIVE.token}
						/>
						<ValueDifference value={VALUE_DIFFERENCE_PCT} />
					</div>
				{/snippet}

				{#snippet balance()}
					<TokenInputBalance balance={RECEIVE.balance} token={RECEIVE.token} />
				{/snippet}
			</TokenInput>
		</div>

		<div class="mt-2">
			<LandingSmartSwapCell {gain} />
		</div>

		<div class="mt-3"><Hr /></div>

		<div class="flex items-center justify-between py-4 text-base">
			<span class="text-tertiary">{$i18n.swap.text.network_fee}</span>
			<span class="flex gap-2">
				<span class="font-semibold text-primary">{NETWORK_FEE_BTC} {PAY.token.symbol}</span>
				<span class="text-tertiary">~{networkFee}</span>
			</span>
		</div>
	</div>

	<div class="flex gap-3 border-t border-tertiary p-3 sm:px-6">
		<ButtonCancel fullWidth onclick={noop} />
		<Button fullWidth onclick={noop}>{$i18n.swap.text.review_button}</Button>
	</div>
</LandingPreviewFrame>
