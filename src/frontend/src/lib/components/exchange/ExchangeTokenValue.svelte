<script lang="ts">
	import TokenExchangeBalance from '$lib/components/tokens/TokenExchangeBalance.svelte';
	import TokenExchangeValueSkeleton from '$lib/components/tokens/TokenExchangeValueSkeleton.svelte';
	import type { TokenUi } from '$lib/types/token';
	import type { CardData } from '$lib/types/token-card';

	export let data: CardData;

	let balance: TokenUi['balance'];
	let usdBalance: TokenUi['usdBalance'];

	$: ({ balance, usdBalance } = data);
</script>

<TokenExchangeValueSkeleton {data}>
	<TokenExchangeBalance {balance} {usdBalance} />
</TokenExchangeValueSkeleton>
