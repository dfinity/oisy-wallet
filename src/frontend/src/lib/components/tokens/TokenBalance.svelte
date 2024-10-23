<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import TokenBalanceSkeleton from '$lib/components/tokens/TokenBalanceSkeleton.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { TOKEN_BALANCE } from '$lib/constants/test-ids.constants';
	import type { CardData } from '$lib/types/token-card';
	import { formatToken } from '$lib/utils/format.utils';

	export let data: CardData;
</script>

<TokenBalanceSkeleton {data}>
	<output class="break-all" data-tid={`${TOKEN_BALANCE}-${data.symbol}`}>
		{#if nonNullish(data.balance)}
			{formatToken({
				value: data.balance,
				unitName: data.decimals
			})}
		{:else}
			{formatToken({
				value: ZERO,
				unitName: data.decimals
			}).replace('0', '-')}
		{/if}
	</output>
</TokenBalanceSkeleton>
