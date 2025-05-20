<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import TokenBalanceSkeleton from '$lib/components/tokens/TokenBalanceSkeleton.svelte';
	import { TOKEN_BALANCE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CardData } from '$lib/types/token-card';
	import { formatToken } from '$lib/utils/format.utils';
	import type {Snippet} from "svelte";

	interface Props {
		privacyPlaceholder?: Snippet;
		data: CardData;
		hideBalance?: boolean;
	}

	let {privacyPlaceholder, data, hideBalance = false}: Props = $props();
</script>

<TokenBalanceSkeleton {data}>
	<output
		class="break-all"
		data-tid={`${TOKEN_BALANCE}-${data.symbol}-${data.network.id.description}`}
	>
		{#if nonNullish(data.balance)}
			{#if hideBalance}
				{@render privacyPlaceholder()}
			{:else}
				{formatToken({
					value: data.balance,
					unitName: data.decimals
				})}
			{/if}
		{:else}
			<span>{$i18n.tokens.balance.error.not_applicable}</span>
		{/if}
	</output>
</TokenBalanceSkeleton>
