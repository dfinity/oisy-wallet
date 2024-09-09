<script lang="ts">
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import CardAmount from '$lib/components/ui/CardAmount.svelte';
	import type { TokenUi } from '$lib/types/token';

	export let token: TokenUi;
</script>

<TokenCard {token}>
	<TokenBalance {token} slot="description" />

	<CardAmount slot="exchange">
		<ExchangeTokenValue {token} />
	</CardAmount>
</TokenCard>
