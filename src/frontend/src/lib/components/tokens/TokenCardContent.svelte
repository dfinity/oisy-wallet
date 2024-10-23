<script lang="ts">
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import type { CardData } from '$lib/types/token-card';

	export let token: CardData;
</script>

<TokenCard {token}>
	<TokenBalance {token} slot="balance" />

	<ExchangeTokenValue {token} slot="exchange" />
</TokenCard>
