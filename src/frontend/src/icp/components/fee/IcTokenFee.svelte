<script lang="ts">
	import { formatToken } from '$lib/utils/format.utils';
	import Value from '$lib/components/ui/Value.svelte';
	import { BigNumber } from '@ethersproject/bignumber';
	import { tokenDecimals } from '$lib/derived/token.derived';
	import type { OptionIcToken } from '$icp/types/ic';
	import { nonNullish } from '@dfinity/utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';

	let decimals: number | undefined;
	$: decimals = $token?.decimals;

	let symbol: string | undefined;
	$: symbol = $token?.symbol;

	let fee: bigint | undefined;
	$: fee = ($token as OptionIcToken)?.fee;
</script>

<Value ref="fee">
	<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>

	{#if nonNullish(fee) && nonNullish(decimals) && nonNullish(symbol)}
		{formatToken({
			value: BigNumber.from(fee),
			unitName: decimals,
			displayDecimals: $tokenDecimals
		})}
		{symbol}
	{/if}
</Value>
