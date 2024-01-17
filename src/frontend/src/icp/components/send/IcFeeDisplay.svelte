<script lang="ts">
	import { formatTokenShort } from '$lib/utils/format.utils.js';
	import Value from '$lib/components/ui/Value.svelte';
	import { BigNumber } from '@ethersproject/bignumber';
	import { token, tokenDecimals } from '$lib/derived/token.derived';
	import type { IcToken } from '$icp/types/ic';
	import { nonNullish } from '@dfinity/utils';

	let decimals: number;
	let symbol: string;

	$: ({ decimals, symbol } = $token);

	let fee: bigint | undefined;
	$: fee = ($token as IcToken).fee;
</script>

<Value ref="fee">
	<svelte:fragment slot="label">Fee</svelte:fragment>

	{#if nonNullish(fee)}
		{formatTokenShort({
			value: BigNumber.from(fee),
			unitName: decimals,
			displayDecimals: $tokenDecimals
		})}
		{symbol}
	{/if}
</Value>
