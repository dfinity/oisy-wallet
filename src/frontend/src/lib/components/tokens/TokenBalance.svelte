<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import TokenBalanceSkeleton from '$lib/components/tokens/TokenBalanceSkeleton.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import type { TokenUi } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import { TOKEN_BALANCE } from '$lib/constants/test-ids.constants';

	export let token: TokenUi;
</script>

<TokenBalanceSkeleton {token}>
	<output class="break-all" data-tid={`${TOKEN_BALANCE}-${token.symbol}`}>
		{#if nonNullish(token.balance)}
			{formatToken({
				value: token.balance,
				unitName: token.decimals
			})}
		{:else}
			{formatToken({
				value: ZERO,
				unitName: token.decimals
			}).replace('0', '-')}
		{/if}
	</output>
</TokenBalanceSkeleton>
