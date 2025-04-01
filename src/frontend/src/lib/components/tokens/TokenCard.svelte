<script lang="ts">
	import { slide } from 'svelte/transition';
	import { nonNullish, type Token } from '@dfinity/utils';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenName from '$lib/components/tokens/TokenName.svelte';
	import TokenSymbol from '$lib/components/tokens/TokenSymbol.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { TOKEN_CARD, TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import type { LogoSize } from '$lib/types/components';
	import type { CardData } from '$lib/types/token-card';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';

	export let data: CardData;
	export let testIdPrefix: typeof TOKEN_CARD | typeof TOKEN_GROUP = TOKEN_CARD;
	export let cardSize: 'xs' | 'lg' = 'lg';
	export let hideNetworkLogo = false;
	export let isExpanded = false;
	export let hover = false;
	export let description = '';
</script>

<div class="flex w-full flex-col">
	<LogoButton
		dividers={false}
		rounded={false}
		testId={`${testIdPrefix}-${data.symbol}-${data.network.id.description}`}
		on:click
		spacings={cardSize === 'xs' ? 'sm' : 'md'}
		{hover}
	>
		<TokenLogo
			{data}
			badge={nonNullish(data.tokenCount)
				? { type: 'tokenCount', count: data.tokenCount }
				: undefined}
			slot="logo"
			color="white"
			logoSize={cardSize}
		/>

		<span class:text-sm={cardSize === 'xs'} slot="title">
			{data.symbol}
		</span>

		<span class:text-sm={cardSize === 'xs'} slot="subtitle">&nbsp;&middot;&nbsp;{data.name}</span>

		<span class:text-sm={cardSize === 'xs'} class="block min-w-12" slot="title-end">
			<TokenBalance {data} />
		</span>

		<span class:text-sm={cardSize === 'xs'} class="block min-w-12" slot="description">
			{@html description}
		</span>

		<span class:text-sm={cardSize === 'xs'} class="block min-w-12" slot="description-end">
			<ExchangeTokenValue {data} />
		</span>
	</LogoButton>
</div>
<!--
<Card noMargin testId={`${testIdPrefix}-${data.symbol}-${data.network.id.description}`}>
	<TokenSymbol {data} {hideNetworkLogo} />

	<TokenName {data} slot="description" />

	<TokenLogo
		{data}
		badge={nonNullish(data.tokenCount) ? { type: 'tokenCount', count: data.tokenCount } : undefined}
		slot="icon"
		color="white"
		{logoSize}
	/>

	<slot name="balance" slot="amount" />

	<slot name="exchange" slot="amountDescription" />
</Card>
-->
