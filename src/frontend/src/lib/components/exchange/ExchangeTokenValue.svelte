<script lang="ts">
	import TokenExchangeBalance from '$lib/components/tokens/TokenExchangeBalance.svelte';
	import TokenExchangeValueSkeleton from '$lib/components/tokens/TokenExchangeValueSkeleton.svelte';
	import type { TokenUi } from '$lib/types/token';

	export let token: TokenUi;

	let balance: TokenUi['balance'];
	let usdBalance: TokenUi['usdBalance'];

	$: ({ balance, usdBalance } = token);
</script>

<TokenExchangeValueSkeleton {token}>
	<TokenExchangeBalance {balance} {usdBalance} />
</TokenExchangeValueSkeleton>
