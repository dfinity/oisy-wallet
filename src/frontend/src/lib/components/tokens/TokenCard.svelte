<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { TOKEN_CARD, type TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CardData } from '$lib/types/token-card';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';

	let {
		data,
		testIdPrefix = TOKEN_CARD,
		asNetwork = false,
		hover = false
	}: {
		data: CardData;
		testIdPrefix?: typeof TOKEN_CARD | typeof TOKEN_GROUP;
		asNetwork?: boolean;
		hover?: boolean;
	} = $props();
</script>

<div class="flex w-full flex-col">
	<LogoButton
		dividers={false}
		rounded={false}
		testId={`${testIdPrefix}-${data.symbol}-${data.network.id.description}`}
		on:click
		condensed={asNetwork}
		{hover}
	>
		<span class="flex" slot="logo" class:mr-2={!asNetwork}>
			<TokenLogo
				{data}
				badge={nonNullish(data.tokenCount)
					? { type: 'tokenCount', count: data.tokenCount }
					: { type: 'network' }}
				color="white"
				logoSize={asNetwork ? 'xs' : 'lg'}
			/>
		</span>

		<span class:text-sm={asNetwork} slot="title">
			{data.symbol}
			{#if asNetwork}
				<span class="font-normal">
					{replacePlaceholders($i18n.tokens.text.on_network, { $network: data.network.name })}
				</span>
			{/if}
		</span>

		<span class:text-sm={asNetwork} slot="subtitle">
			{#if !asNetwork}
				&nbsp;&middot;&nbsp;{data.name}
			{/if}
		</span>

		<span class:text-sm={asNetwork} class="block min-w-12 text-nowrap" slot="title-end">
			<TokenBalance {data} hideBalance={$isPrivacyMode}>
				{#snippet privacyBalance()}
					<IconDots variant={asNetwork ? 'sm' : 'md'} styleClass={asNetwork ? 'my-4.25' : 'pb-4'} />
				{/snippet}
			</TokenBalance>
		</span>

		<span class:text-sm={asNetwork} slot="description">
			{#if data?.networks}
				{#each [...new Set(data.networks.map((n) => n.name))] as network, index (network)}
					{#if index !== 0}
						&nbsp;&middot;&nbsp;
					{/if}
					{network}
				{/each}
			{:else if !asNetwork}
				{data.network.name}
			{/if}
		</span>

		<span class:text-sm={asNetwork} class="block min-w-12 text-nowrap" slot="description-end">
			{#if !$isPrivacyMode}
				<ExchangeTokenValue {data} />
			{/if}
		</span>
	</LogoButton>
</div>
