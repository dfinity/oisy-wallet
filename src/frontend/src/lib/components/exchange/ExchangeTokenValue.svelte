<script lang="ts">
	import TokenExchangeBalance from '$lib/components/tokens/TokenExchangeBalance.svelte';
	import TokenExchangeValueSkeleton from '$lib/components/tokens/TokenExchangeValueSkeleton.svelte';
	import type { TokenUiBalance } from '$lib/types/token';

	export let tokenUiBalance: TokenUiBalance;

	let balance: TokenUiBalance['balance'];
	let usdBalance: TokenUiBalance['usdBalance'];

	$: ({ balance, usdBalance } = tokenUiBalance);
</script>

<TokenExchangeValueSkeleton {tokenUiBalance}>
	<TokenExchangeBalance {balance} {usdBalance} />
</TokenExchangeValueSkeleton>
