<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { GET_TOKEN_MODAL_POTENTIAL_USD_BALANCE } from '$lib/constants/test-ids.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token: Token;
		currentApy: number;
		potentialTokensUsdBalance: number;
		title: Snippet;
		label: Snippet;
	}

	let { token, currentApy, potentialTokensUsdBalance, title, label }: Props = $props();

	let tokenSymbol = $derived(getTokenDisplaySymbol(token));

	let tokenExchangeRate = $derived($exchanges?.[token.id]?.usd ?? 0);

	let potentialTokenBalance = $derived(
		tokenExchangeRate > 0 && potentialTokensUsdBalance > 0
			? Math.round(potentialTokensUsdBalance / tokenExchangeRate)
			: 0
	);

	let positivePotentialTokenBalance = $derived(potentialTokenBalance > 0);
</script>

<div class="mb-2 text-base font-bold">
	{@render title()}
</div>

<div>
	<div class="text-sm text-tertiary">
		{@render label()}
	</div>

	<div class="flex items-center justify-center gap-2 text-sm sm:text-base">
		<span
			class="font-bold"
			class:text-disabled={!positivePotentialTokenBalance}
			data-tid={GET_TOKEN_MODAL_POTENTIAL_USD_BALANCE}
		>
			{formatCurrency({
				value: potentialTokensUsdBalance,
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage
			})}
		</span>

		{#if positivePotentialTokenBalance}
			<span class="text-tertiary" in:fade>
				{`${positivePotentialTokenBalance ? '~' : ''}${potentialTokenBalance}`}
				{tokenSymbol}
			</span>
		{/if}
	</div>
</div>

<div>
	<div class="text-sm text-tertiary">
		{$i18n.stake.text.earning_potential}:
	</div>

	<div
		class="text-lg font-bold sm:text-xl"
		class:text-brand-primary-alt={positivePotentialTokenBalance}
		class:text-disabled={!positivePotentialTokenBalance}
	>
		{`${positivePotentialTokenBalance && currentApy > 0 ? '+' : ''}`}{replacePlaceholders(
			$i18n.stake.text.active_earning_per_year,
			{
				$amount: `${formatCurrency({
					value: (potentialTokensUsdBalance * currentApy) / 100,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})}`
			}
		)}
	</div>
</div>
