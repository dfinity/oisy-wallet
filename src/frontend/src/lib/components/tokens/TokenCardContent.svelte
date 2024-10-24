<script lang="ts">
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import type { CardData } from '$lib/types/token-card';

	export let data: CardData;
</script>

<TokenCard {data}>
	<TokenBalance {data} slot="balance" />

	<ExchangeTokenValue {data} slot="exchange" />
</TokenCard>
