<script lang="ts">
	import type { Snippet } from 'svelte';
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import type { OptionAmount } from '$lib/types/send';
	import type { ModalHeroVariant } from '$lib/types/style';
	import type { Token } from '$lib/types/token';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token: Token;
		subtitle?: Snippet;
		sendAmount?: OptionAmount;
		exchangeRate?: number;
		content?: Snippet;
		variant?: ModalHeroVariant;
	}

	let { token, sendAmount, exchangeRate, content, variant, subtitle }: Props = $props();
</script>

<ModalHero {content} {subtitle} {variant}>
	{#snippet logo()}
		<TokenLogo badge={{ type: 'network' }} data={token} logoSize="lg" />
	{/snippet}

	{#snippet title()}
		{sendAmount}
		{getTokenDisplaySymbol(token)}
	{/snippet}

	{#snippet description()}
		<ConvertAmountExchange amount={sendAmount} {exchangeRate} />
	{/snippet}
</ModalHero>
