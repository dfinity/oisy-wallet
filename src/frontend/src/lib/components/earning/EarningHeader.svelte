<script lang="ts">
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { balancesStore } from '$lib/stores/balances.store';
	import { sumTokensUiUsdBalance } from '$lib/utils/tokens.utils';
	import { combinedDerivedSortedFungibleNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { getDailyAn$alytics } from '$icp/api/gldt_stake.api';
	import { authIdentity } from '$lib/derived/auth.derived';

	const allStakingApys = $derived.by(async () => {
		const { apy } = await getDailyAnalytics({ identity: $authIdentity });
	});

	const totalUsd = $derived(sumTokensUiUsdBalance($combinedDerivedSortedFungibleNetworkTokensUi));

	let balance = $derived(
		formatCurrency({
			value: totalUsd ?? 0,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);
</script>

<div class="flex w-full flex-col items-center rounded-3xl bg-primary p-4 text-center">
	<h2>Welcome to Earn!</h2>
	<p class="mt-3 mb-8">
		Grow your crypto portfolio by staking your tokens and earning rewards. Choose from various
		earning strategies based on your risk tolerance. <ExternalLink
			iconAsLast
			inline
			href="#"
			ariaLabel="Learn more">Learn more</ExternalLink
		>
	</p>

	<div class="flex w-full justify-between gap-4">
		<div class="bg flex flex-1 flex-col gap-3 rounded-xl border-1 border-disabled bg-disabled p-3">
			<span class="text-lg">Earning potential</span>
			<span class="text-[28px] font-bold text-brand-primary">+$2121 / year</span>
			<span class="text-lg font-bold">{balance}</span>
		</div>

		<div class="flex flex-1 flex-col gap-3 rounded-xl border-1 border-disabled bg-disabled p-3">
			<span class="text-lg">Earning potential</span>
			<span class="text-[28px] font-bold text-success-primary">$2121 / year</span>
			<span class="text-lg font-bold">+$2121</span>
		</div>
	</div>
</div>
