<script lang="ts">
	import { formatTokenShort } from '$lib/utils/format.utils.js';
	import { ICP_TOKEN } from '$lib/constants/tokens.constants.js';
	import Value from '$lib/components/ui/Value.svelte';
	import { ICP_TRANSACTION_FEE_E8S } from '$lib/constants/icp.constants';
	import { BigNumber } from '@ethersproject/bignumber';
</script>

<Value ref="fee">
	<svelte:fragment slot="label">Fee</svelte:fragment>

	{formatTokenShort({
		value: BigNumber.from(ICP_TRANSACTION_FEE_E8S),
		unitName: ICP_TOKEN.decimals
	})}
	{ICP_TOKEN.symbol}
</Value>
