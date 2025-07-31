<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import Divider from '$lib/components/common/Divider.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import EnableTokenToggle from '$lib/components/tokens/EnableTokenToggle.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { TOKEN_CARD, type TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import type { CardData } from '$lib/types/token-card';
	import type { TokenToggleable } from '$lib/types/token-toggleable';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';
	import { isCardDataTogglableToken } from '$lib/utils/token-card.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	let {
		data,
		testIdPrefix = TOKEN_CARD,
		asNetwork = false,
		hover = false,
		onToggle
	}: {
		data: CardData;
		testIdPrefix?: typeof TOKEN_CARD | typeof TOKEN_GROUP;
		asNetwork?: boolean;
		hover?: boolean;
		onToggle?: (t: CustomEvent<Token>) => void;
	} = $props();

	const dispatch = createEventDispatcher();

	let testId = $derived(
		`${testIdPrefix}-${data.symbol}${nonNullish(data.network) ? `-${data.network.id.description}` : ''}`
	);

	let token: TokenToggleable<Token> | undefined = $derived(
		isCardDataTogglableToken(data) ? data : undefined
	);
</script>

<div class="flex w-full flex-col">
	<LogoButton
		condensed={asNetwork}
		dividers={false}
		{hover}
		onClick={() => dispatch('click')}
		rounded={false}
		{testId}
	>
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
			<span class:text-sm={asNetwork}>
				{#if !asNetwork}
					<Divider />{data.name}
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
					{#each [...new Set(data.networks.map((n) => n.name))] as network, index (network)}
						{#if index !== 0}
							<Divider />
						{/if}{network}
					{/each}
				{:else if !asNetwork && nonNullish(data.network)}
					{data.network.name}
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
