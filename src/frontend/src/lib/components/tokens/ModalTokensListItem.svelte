<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import type { Token } from '$lib/types/token';

	interface Props {
		token: Token;
		logoSize?: LogoSize;
		onClick: () => void;
		showDividers?: boolean;
	}

	let { token, logoSize = 'lg', onClick, showDividers = true }: Props = $props();

	const { oisyName, oisySymbol, symbol, name, network } = token;
</script>

<LogoButton dividers={showDividers} fullWidth {onClick}>
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
			<TokenLogo badge={{ type: 'network' }} color="white" data={token} {logoSize} />
		</div>
	{/snippet}

	{#snippet titleEnd()}
		<div class="ml-1 min-w-12 text-nowrap">
			<TokenBalance data={token} />
		</div>
	{/snippet}

	{#snippet descriptionEnd()}
		<ExchangeTokenValue data={token} />
	{/snippet}
</LogoButton>
