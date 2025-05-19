<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import TokenBalanceSkeleton from '$lib/components/tokens/TokenBalanceSkeleton.svelte';
	import { TOKEN_BALANCE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CardData } from '$lib/types/token-card';
	import { formatToken } from '$lib/utils/format.utils';
	import IconDots from "$lib/components/icons/IconDots.svelte";

	interface Props {
		data: CardData;
		hideBalance?: boolean;
	}

	let {data, hideBalance = false}: Props = $props();
</script>

<TokenBalanceSkeleton {data}>
	<output
		class="break-all"
		data-tid={`${TOKEN_BALANCE}-${data.symbol}-${data.network.id.description}`}
	>
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
