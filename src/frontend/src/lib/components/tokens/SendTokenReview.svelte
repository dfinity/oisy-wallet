<script lang="ts">
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

<div
	class="mb-6 flex flex-col items-center justify-center rounded-lg border border-solid border-tertiary bg-primary p-4 shadow-sm"
>
	<TokenLogo data={token} logoSize="md" badge={{ type: 'network' }} />

	<div class="text-2xl font-bold">
		{sendAmount}
		{token.symbol}
	</div>

	<div class="text-sm text-tertiary">
		<ConvertAmountExchange amount={sendAmount} {exchangeRate} />
	</div>
</div>
