<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import TokenBalanceSkeleton from '$lib/components/tokens/TokenBalanceSkeleton.svelte';
	import { TOKEN_BALANCE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CardData } from '$lib/types/token-card';
	import { formatToken } from '$lib/utils/format.utils';

	interface Props {
		privacyBalance?: Snippet;
		data: CardData;
		hideBalance?: boolean;
	}

	let { privacyBalance, data, hideBalance = false }: Props = $props();

	let testId = $derived(
		`${TOKEN_BALANCE}-${data.symbol}${nonNullish(data.network) ? `-${data.network.id.description}` : ''}`
	);
</script>

<TokenBalanceSkeleton {data}>
	<output class="break-all" data-tid={testId}>
		{#if nonNullish(data.balance)}
			{#if hideBalance}
				{@render privacyBalance?.()}
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
