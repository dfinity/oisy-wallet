<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
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
</script>

<LogoButton on:click dividers={true}>
	<svelte:fragment slot="title">
		{nonNullish(oisySymbol) ? oisySymbol.oisySymbol : symbol}
	</svelte:fragment>

	<svelte:fragment slot="subtitle">
		{#if nonNullish(oisyName?.prefix)}
			{$i18n.tokens.text.chain_key}
		{/if}

		{oisyName?.oisyName ?? name}
	</svelte:fragment>

	<svelte:fragment slot="description">
		{network.name}
	</svelte:fragment>

	<div class="mr-2" slot="logo">
		<TokenLogo {data} color="white" badge={{ type: 'network' }} {logoSize} />
	</div>

	<TokenBalance {data} slot="title-end" />

	<ExchangeTokenValue {data} slot="description-end" />
</LogoButton>
