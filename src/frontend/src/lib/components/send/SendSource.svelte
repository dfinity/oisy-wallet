<script lang="ts">
	import { formatTokenDetailed } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { balance } from '$lib/derived/balances.derived';
	import type { Token } from '$lib/types/token';
	import Value from '$lib/components/ui/Value.svelte';

	export let token: Token;
	export let source: string;
</script>

<Value ref="source" element="div">
	<svelte:fragment slot="label">Source</svelte:fragment>
	{source}
</Value>

<Value ref="balance" element="div">
	<svelte:fragment slot="label">Balance</svelte:fragment>
	{formatTokenDetailed({
		value: $balance ?? BigNumber.from(0n),
		unitName: token.decimals
	})}
	{token.symbol}
</Value>
