<script lang="ts">
	import TokenExchangeBalance from '$lib/components/tokens/TokenExchangeBalance.svelte';
	import TokenExchangeValueSkeleton from '$lib/components/tokens/TokenExchangeValueSkeleton.svelte';
	import type { TokenUi } from '$lib/types/token';

	export let token: TokenUi;
</script>

<TokenExchangeValueSkeleton {token}>
	<TokenExchangeBalance usdBalance={token.usdBalance} />
</TokenExchangeValueSkeleton>
