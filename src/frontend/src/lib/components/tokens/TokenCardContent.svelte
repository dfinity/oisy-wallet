<script lang="ts">
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import CardAmount from '$lib/components/ui/CardAmount.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import type { Token } from '$lib/types/token';

	export let token: Token;
</script>

<TokenCard {token}>
	<TokenBalance {token} slot="description" />

	<CardAmount slot="exchange">
		<ExchangeTokenValue {token} />
	</CardAmount>
</TokenCard>
