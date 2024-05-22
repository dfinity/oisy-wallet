<script lang="ts">
	import { formatToken } from '$lib/utils/format.utils.js';
	import Value from '$lib/components/ui/Value.svelte';
	import { BigNumber } from '@ethersproject/bignumber';
	import { token, tokenDecimals } from '$lib/derived/token.derived';
	import type { IcToken } from '$icp/types/ic';
	import { nonNullish } from '@dfinity/utils';
	import { i18n } from '$lib/stores/i18n.store';

	let decimals: number;
	let symbol: string;

	$: ({ decimals, symbol } = $token);

	let fee: bigint | undefined;
	$: fee = ($token as IcToken).fee;
</script>

<Value ref="fee">
	<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>

	{#if nonNullish(fee)}
		{formatToken({
			value: BigNumber.from(fee),
			unitName: decimals,
			displayDecimals: $tokenDecimals
		})}
		{symbol}
	{/if}
</Value>
