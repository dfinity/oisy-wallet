<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import TokenExchangeValueSkeleton from '$lib/components/tokens/TokenExchangeValueSkeleton.svelte';
	import type { TokenUiBalance } from '$lib/types/token';
	import { formatUSD } from '$lib/utils/format.utils';

	export let token: TokenUiBalance;
</script>

<TokenExchangeValueSkeleton {token}>
	<output class="break-all">
		{#if nonNullish(token.balance) && nonNullish(token.usdBalance)}
			{formatUSD({ value: token.usdBalance })}
		{:else}
			{formatUSD({ value: 0, options: { minFraction: 0, maxFraction: 0 } }).replace('0', '-')}
		{/if}
	</output>
</TokenExchangeValueSkeleton>
