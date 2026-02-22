<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import Divider from '$lib/components/common/Divider.svelte';
	import ExchangeRateChange from '$lib/components/exchange/ExchangeRateChange.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import EnableTokenToggle from '$lib/components/tokens/EnableTokenToggle.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { TOKEN_CARD, type TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import type { CardData } from '$lib/types/token-card';
	import type { TokenToggleable } from '$lib/types/token-toggleable';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';
	import { isCardDataTogglableToken } from '$lib/utils/token-card.utils';
	import { getTokenDisplayName, getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		data: CardData;
		testIdPrefix?: typeof TOKEN_CARD | typeof TOKEN_GROUP;
		asNetwork?: boolean;
		hover?: boolean;
		onClick?: () => void;
		onToggle?: (t: Token) => void;
	}

	let {
		data,
		testIdPrefix = TOKEN_CARD,
		asNetwork = false,
		hover = false,
		onClick,
		onToggle
	}: Props = $props();

	let testId = $derived(
		`${testIdPrefix}-${data.symbol}${nonNullish(data.network) ? `-${data.network.id.description}` : ''}`
	);

	let token: TokenToggleable<Token> | undefined = $derived(
		isCardDataTogglableToken(data) ? data : undefined
	);

	let { usdPrice, usdPriceChangePercentage24h } = $derived(data);

	let formattedExchangeRate = $derived(
		nonNullish(usdPrice)
			? formatCurrency({
					value: usdPrice,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})
			: undefined
	);

	let name = $derived(getTokenDisplayName(data));
</script>

<div class="flex w-full flex-col">
	<LogoButton condensed={asNetwork} dividers={false} {hover} {onClick} rounded={false} {testId}>
		{#snippet logo()}
			<span class="flex" class:mr-2={!asNetwork}>
				<TokenLogo
					badge={nonNullish(data.tokenCount)
						? { type: 'tokenCount', count: data.tokenCount }
						: { type: 'network' }}
					color="white"
					{data}
					logoSize={asNetwork ? 'xs' : 'lg'}
				/>
			</span>
		{/snippet}

		{#snippet title()}
			<span class:text-sm={asNetwork}>
				{getTokenDisplaySymbol(data)}
				{#if asNetwork && nonNullish(data.network)}
					<span class="font-normal">
						{replacePlaceholders($i18n.tokens.text.on_network, { $network: data.network.name })}
					</span>
				{/if}
			</span>
		{/snippet}

		{#snippet subtitle()}
			<span
				class="flex items-center gap-1 sm:gap-2"
				class:ml-2={!asNetwork}
				class:sm:ml-4={!asNetwork}
				class:text-sm={asNetwork}
			>
				{#if !asNetwork}
					{formattedExchangeRate}
					<ExchangeRateChange {usdPriceChangePercentage24h} />
				{/if}
			</span>
		{/snippet}

		{#snippet titleEnd()}
			{#if isNullish(onToggle)}
				<span class="block min-w-12 text-nowrap" class:text-sm={asNetwork}>
					<TokenBalance {data} hideBalance={$isPrivacyMode}>
						{#snippet privacyBalance()}
							<IconDots
								styleClass={asNetwork ? 'my-4.25' : 'pb-4'}
								variant={asNetwork ? 'sm' : 'md'}
							/>
						{/snippet}
					</TokenBalance>
				</span>
			{/if}
		{/snippet}

		{#snippet description()}
			<span class:text-sm={asNetwork}>
				{#if data?.networks}
					{@const networks = [...new Set(data.networks.map((n) => n.name))].sort((a, b) =>
						a.localeCompare(b)
					)}

					<span class="text-primary">{data.name}</span>
					{replacePlaceholders($i18n.tokens.text.on_network, { $network: '' })}
					{#each networks as network, index (network)}
						{#if index !== 0}
							<Divider />
						{/if}{network}
					{/each}
				{:else if !asNetwork && nonNullish(data.network)}
					<span class="text-primary">{name}</span>
					{#if name !== data.network.name}
						{replacePlaceholders($i18n.tokens.text.on_network, { $network: data.network.name })}
					{/if}
				{/if}
			</span>
		{/snippet}

		{#snippet descriptionEnd()}
			<span class="block min-w-12 text-nowrap" class:text-sm={asNetwork}>
				{#if nonNullish(onToggle) && nonNullish(token)}
					<EnableTokenToggle {onToggle} {token} />
				{:else if !$isPrivacyMode}
					<ExchangeTokenValue {data} />
				{/if}
			</span>
		{/snippet}
	</LogoButton>
</div>
