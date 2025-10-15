<script lang="ts">
	import { run } from 'svelte/legacy';
	import TokenExchangeBalance from '$lib/components/tokens/TokenExchangeBalance.svelte';
	import TokenExchangeValueSkeleton from '$lib/components/tokens/TokenExchangeValueSkeleton.svelte';
	import type { CardData } from '$lib/types/token-card';

	interface Props {
		data: CardData;
	}

	let { data }: Props = $props();

	let { balance, usdBalance } = $derived(data);
</script>

<TokenExchangeValueSkeleton {data}>
	<TokenExchangeBalance {balance} {usdBalance} />
</TokenExchangeValueSkeleton>
