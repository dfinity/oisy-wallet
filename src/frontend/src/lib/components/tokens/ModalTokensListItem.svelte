<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import IconGixCheck from '$lib/components/icons/IconGixCheck.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import type { Token } from '$lib/types/token';
	import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
	import { getTokenDisplayName } from '$lib/utils/token.utils';

	interface Props {
		token: Token;
		logoSize?: LogoSize;
		onClick: () => void;
		showDividers?: boolean;
		// The token already picked where this list was opened from; unset where a list has no pick.
		selected?: boolean;
		disabled?: boolean;
		// A row a caller names itself, the swap's network step: `label` replaces the symbol and the
		// token's name; `detail` replaces the network under them.
		// The logo is then left out of the row's name, which the label already says.
		label?: Snippet;
		detail?: Snippet;
	}

	let {
		token,
		logoSize = 'lg',
		onClick,
		showDividers = true,
		selected,
		disabled = false,
		label,
		detail
	}: Props = $props();

	const { oisyName, oisySymbol, symbol, network } = $derived(token);

	// For disabled tokens, we don't have the balance workers running, so we can't show the balance.
	// TODO: Instead of hiding balances we should show a toggle or button to enable the token saying "Enable to see balance"
	let showBalance = $derived(!isTokenToggleable(token) || token.enabled);
</script>

{#snippet tokenName()}
	{#if nonNullish(oisyName?.prefix)}
		{$i18n.tokens.text.chain_key}
	{/if}

	{getTokenDisplayName(token)}
{/snippet}

<LogoButton
	{disabled}
	dividers={showDividers}
	fullWidth
	{onClick}
	{selected}
	styleClass={selected ? 'bg-brand-subtle-10' : undefined}
	subtitle={isNullish(label) ? tokenName : undefined}
>
	{#snippet title()}
		{#if selected}
			<!-- Beside the symbol rather than in a column of its own, so no other row shifts. Centred
				 on the line box, then lifted 1px so it sits on the capitals' middle, not the line's. -->
			<span class="inline-flex items-center gap-1">
				{#if nonNullish(label)}
					{@render label()}
				{:else}
					{nonNullish(oisySymbol) ? oisySymbol.oisySymbol : symbol}
				{/if}
				<span class="flex -translate-y-px text-brand-primary-alt" aria-hidden="true">
					<IconGixCheck size="18px" />
				</span>
			</span>
		{:else if nonNullish(label)}
			{@render label()}
		{:else}
			{nonNullish(oisySymbol) ? oisySymbol.oisySymbol : symbol}
		{/if}
	{/snippet}

	{#snippet description()}
		{#if nonNullish(detail)}
			{@render detail()}
		{:else}
			{network.name}
		{/if}
	{/snippet}

	{#snippet logo()}
		<div class="mr-2" aria-hidden={nonNullish(label) ? 'true' : undefined}>
			<TokenLogo badge={{ type: 'network' }} color="white" data={token} {logoSize} />
		</div>
	{/snippet}

	{#snippet titleEnd()}
		{#if showBalance}
			<div class="ml-1 min-w-12 text-nowrap">
				<TokenBalance data={token} hideBalance={$isPrivacyMode}>
					{#snippet privacyBalance()}<IconDots styleClass="pb-4" />{/snippet}
				</TokenBalance>
			</div>
		{/if}
	{/snippet}

	{#snippet descriptionEnd()}
		{#if showBalance && !$isPrivacyMode}
			<ExchangeTokenValue data={token} />
		{/if}
	{/snippet}
</LogoButton>
