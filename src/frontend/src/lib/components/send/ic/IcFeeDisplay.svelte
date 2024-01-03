<script lang="ts">
	import { formatTokenShort } from '$lib/utils/format.utils.js';
	import Value from '$lib/components/ui/Value.svelte';
	import { BigNumber } from '@ethersproject/bignumber';
	import { token } from '$lib/derived/token.derived';
	import type { IcToken } from '$lib/types/ic';
	import { ICP_FEE_DECIMALS } from '$lib/constants/icp.constants';

	// We know here the token is of standard IC
	let fee: bigint;
	let decimals: number;
	let symbol: string;

	$: ({ decimals, symbol, fee } = $token as IcToken);
</script>

<Value ref="fee">
	<svelte:fragment slot="label">Fee</svelte:fragment>

	{formatTokenShort({
		value: BigNumber.from(fee),
		unitName: decimals,
		displayDecimals: ICP_FEE_DECIMALS
	})}
	{symbol}
</Value>
