<script lang="ts">
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';

	interface Props {
		token: Token;
		sendAmount?: OptionAmount;
		exchangeRate?: number;
	}

	let { token, sendAmount, exchangeRate }: Props = $props();
</script>

<ModalHero>
	{#snippet logo()}
		<TokenLogo data={token} logoSize="md" badge={{ type: 'network' }} />
	{/snippet}

	{#snippet title()}
		{sendAmount}
		{token.symbol}
	{/snippet}

	{#snippet description()}
		<ConvertAmountExchange amount={sendAmount} {exchangeRate} />
	{/snippet}
</ModalHero>
