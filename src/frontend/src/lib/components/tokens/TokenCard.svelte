<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { TOKEN_CARD, type TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import type { CardData } from '$lib/types/token-card';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';

	export let data: CardData;
	export let testIdPrefix: typeof TOKEN_CARD | typeof TOKEN_GROUP = TOKEN_CARD;
	export let condensed = false;
	export let asNetwork = false;
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
		<span class="flex" slot="logo" class:mr-2={!condensed}>
			<TokenLogo
				{data}
				badge={nonNullish(data.tokenCount)
					? { type: 'tokenCount', count: data.tokenCount }
					: { type: 'network', size: condensed ? 'xs' : 'base', blackAndWhite: true }}
				color="white"
				logoSize={condensed ? 'xs' : 'lg'}
			/>
		</span>

		<span class:text-sm={condensed} slot="title">
			{data.symbol}
			{#if asNetwork}
				{replacePlaceholders($i18n.tokens.text.on_network, { $network: data.network.name })}
			{/if}
		</span>

		<span class:text-sm={condensed} slot="subtitle">
			{#if !condensed}
				&nbsp;&middot;&nbsp;{data.name}
			{/if}
		</span>

		<span class:text-sm={condensed} class="block min-w-12 text-nowrap" slot="title-end">
			<TokenBalance {data} />
		</span>

		<span class:text-sm={condensed} slot="description">
			{#if data?.networks}
				{#each [...new Set(data.networks.map((n) => n.name))] as network, index (network)}
					{#if index !== 0}
						&nbsp;&middot;&nbsp;
					{/if}
					{network}
				{/each}
			{:else if !condensed}
				{data.network.name}
			{/if}
		</span>

		<span class:text-sm={condensed} class="block min-w-12 text-nowrap" slot="description-end">
			<ExchangeTokenValue {data} />
		</span>
	</LogoButton>
</div>
