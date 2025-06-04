<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import type { CardData } from '$lib/types/token-card';

	interface Props {
		data: CardData;
		logoSize?: LogoSize;
	}

	let { data, logoSize = 'lg' }: Props = $props();

	const { oisyName, oisySymbol, symbol, name, network } = data;

	const dispatch = createEventDispatcher();
</script>

<LogoButton onClick={() => dispatch('click')} dividers={true}>
	{#snippet title()}
		{nonNullish(oisySymbol) ? oisySymbol.oisySymbol : symbol}
	{/snippet}

	{#snippet subtitle()}
		{#if nonNullish(oisyName?.prefix)}
			{$i18n.tokens.text.chain_key}
		{/if}

		{oisyName?.oisyName ?? name}
	{/snippet}

	{#snippet description()}
		{network.name}
	{/snippet}

	{#snippet logo()}
		<div class="mr-2">
			<TokenLogo {data} color="white" badge={{ type: 'network' }} {logoSize} />
		</div>
	{/snippet}

	{#snippet titleEnd()}
		<TokenBalance {data} />
	{/snippet}

	{#snippet descriptionEnd()}
		<ExchangeTokenValue {data} />
	{/snippet}
</LogoButton>
