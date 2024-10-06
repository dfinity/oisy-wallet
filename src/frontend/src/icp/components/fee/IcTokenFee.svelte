<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { IcToken } from '$icp/types/ic';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';

	export let token: Token;

	let decimals: number | undefined;
	$: decimals = token.decimals;

	let symbol: string | undefined;
	$: symbol = token.symbol;

	let fee: bigint | undefined;
	$: fee = (token as IcToken).fee;
</script>

<Value ref="fee">
	<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>

	{#if nonNullish(fee) && nonNullish(decimals) && nonNullish(symbol)}
		{formatToken({
			value: BigNumber.from(fee),
			unitName: decimals,
			displayDecimals: decimals
		})}
		{symbol}
	{/if}
</Value>
