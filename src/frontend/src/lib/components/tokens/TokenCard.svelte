<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { TOKEN_CARD, TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import type { CardData } from '$lib/types/token-card';

	export let data: CardData;
	export let testIdPrefix: typeof TOKEN_CARD | typeof TOKEN_GROUP = TOKEN_CARD;
	export let condensed = false;
	export let hover = false;
</script>

<div class="flex w-full flex-col">
	<LogoButton
		dividers={false}
		rounded={false}
		testId={`${testIdPrefix}-${data.symbol}-${data.network.id.description}`}
		on:click
		{condensed}
		{hover}
	>
		<TokenLogo
			{data}
			badge={nonNullish(data.tokenCount)
				? { type: 'tokenCount', count: data.tokenCount }
				: undefined}
			slot="logo"
			color="white"
			logoSize={condensed ? 'xs' : 'lg'}
		/>

		<span class:text-sm={condensed} slot="title">
			{data.symbol}
		</span>

		<span class:text-sm={condensed} slot="subtitle">&nbsp;&middot;&nbsp;{data.name}</span>

		<span class:text-sm={condensed} class="block min-w-12" slot="title-end">
			<TokenBalance {data} />
		</span>

		<span class:text-sm={condensed} class="block min-w-12" slot="description">
			{#if data?.networks}
				{#each [...new Set(data.networks.map((n) => n.name))] as network, index (network)}
					{#if index !== 0}
						&nbsp;&middot;&nbsp;
					{/if}
					{network}
				{/each}
			{/if}
		</span>

		<span class:text-sm={condensed} class="block min-w-12" slot="description-end">
			<ExchangeTokenValue {data} />
		</span>
	</LogoButton>
</div>
