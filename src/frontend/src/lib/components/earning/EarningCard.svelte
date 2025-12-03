<script lang="ts">
	import Divider from '$lib/components/common/Divider.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProviderUi } from '$lib/types/provider-ui';
	import { formatCurrency, formatStakeApyNumber } from '$lib/utils/format.utils';
	import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';

	interface Props {
		provider: ProviderUi;
	}

	let { provider }: Props = $props();

	let {
		logo: logoSrc,
		name,
		cardTitle,
		maxApy,
		totalEarningPerYear,
		totalPositionUsd
	} = $derived(provider);

	let tokenSymbols = $derived(
		new Set(provider.tokens.map(({ oisySymbol, symbol }) => oisySymbol?.oisySymbol ?? symbol))
	);

	let networkNames = $derived(new Set(provider.tokens.map(({ network: { name } }) => name)));

	let descriptionElements = $derived([...tokenSymbols, ...networkNames]);
</script>

<div class="flex w-full flex-col">
	<LogoButton rounded={false}>
		{#snippet logo()}
			<span class="mr-2 flex">
				<Logo
					alt={replacePlaceholders($i18n.core.alt.logo, { $name: name })}
					color="white"
					size="lg"
					src={logoSrc}
				/>
			</span>
		{/snippet}

		{#snippet title()}
			<span>
				{resolveText({ i18n: $i18n, path: cardTitle })}
				<Tag variant="info">{formatStakeApyNumber(maxApy)}%</Tag>
			</span>
		{/snippet}

		{#snippet titleEnd()}
			<span
				class="block min-w-12 text-nowrap"
				class:text-success-primary={totalEarningPerYear > 0}
				class:text-tertiary={totalEarningPerYear === 0}
			>
				{replacePlaceholders($i18n.stake.text.active_earning_per_year, {
					$amount: `${formatCurrency({
						value: totalEarningPerYear,
						currency: $currentCurrency,
						exchangeRate: $currencyExchangeStore,
						language: $currentLanguage
					})}`
				})}
			</span>
		{/snippet}

		{#snippet description()}
			{#each descriptionElements as element, index (index)}
				{#if index !== 0}
					<Divider />
				{/if}{element}
			{/each}
		{/snippet}

		{#snippet descriptionEnd()}
			<span class="block min-w-12 text-nowrap">
				<output class="break-all">
					{formatCurrency({
						value: totalPositionUsd,
						currency: $currentCurrency,
						exchangeRate: $currencyExchangeStore,
						language: $currentLanguage
					})}
				</output>
			</span>
		{/snippet}
	</LogoButton>
</div>
