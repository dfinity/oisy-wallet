<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import Divider from '$lib/components/common/Divider.svelte';
	import IconAstronautHelmet from '$lib/components/icons/IconAstronautHelmet.svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import type { TokenUi } from '$lib/types/token-ui';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		totalUsdBalance: number;
		tokenCount?: number;
		token?: TokenUi;
		styleClass?: string;
		network?: Network;
		cardDescription?: Snippet;
		onClick: () => void;
	}

	let { token, tokenCount, totalUsdBalance, styleClass, network, cardDescription, onClick }: Props =
		$props();

	let formattedTotalUsdBalance = $derived(
		formatCurrency({
			value: totalUsdBalance,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);
</script>

<LogoButton
	{onClick}
	rounded={false}
	styleClass={`border-b-1 last-of-type:rounded-b-lg first-of-type:rounded-t-lg last-of-type:border-b-0 border-brand-subtle-10 ${styleClass ?? ''}`}
>
	{#snippet logo()}
		<span class="mr-2 flex">
			{#if nonNullish(network)}
				<NetworkLogo {network} size="md" />
			{:else if nonNullish(token)}
				<TokenLogo
					badge={nonNullish(tokenCount)
						? { type: 'tokenCount', count: tokenCount }
						: { type: 'network' }}
					color="white"
					data={token}
					logoSize="md"
				/>
			{:else}
				<IconAstronautHelmet />
			{/if}
		</span>
	{/snippet}

	{#snippet title()}
		<span class="text-sm">
			{nonNullish(token)
				? getTokenDisplaySymbol(token)
				: nonNullish(network)
					? network.name
					: $i18n.ai_assistant.text.show_total_balance_tool_card_title}
		</span>
	{/snippet}

	{#snippet subtitle()}
		<span class="text-sm">
			{#if nonNullish(token)}
				<Divider />{token.name}
			{/if}
		</span>
	{/snippet}

	{#snippet titleEnd()}
		<span class="ml-2 block min-w-12 text-sm text-nowrap">
			{#if $isPrivacyMode}
				<IconDots styleClass="h-[1rem] items-center" times={3} />
			{:else if nonNullish(token) && isNullish(tokenCount)}
				<TokenBalance data={token} />
			{:else}
				{formattedTotalUsdBalance}
			{/if}
		</span>
	{/snippet}

	{#snippet description()}
		<span class="text-sm">
			{@render cardDescription?.()}
		</span>
	{/snippet}

	{#snippet descriptionEnd()}
		{#if nonNullish(token) && isNullish(tokenCount)}
			{#if $isPrivacyMode}
				<IconDots styleClass="h-[1rem] items-center" times={3} />
			{:else}
				{formattedTotalUsdBalance}
			{/if}
		{/if}
	{/snippet}
</LogoButton>
