<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import TokenBalanceSkeleton from '$lib/components/tokens/TokenBalanceSkeleton.svelte';
	import { TOKEN_BALANCE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
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
			<span>{$i18n.tokens.balance.error.not_applicable}</span>
		{/if}
	</output>
</TokenBalanceSkeleton>
