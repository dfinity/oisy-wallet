<script lang="ts">
	import { formatToken } from '$lib/utils/format.utils.js';
	import Value from '$lib/components/ui/Value.svelte';
	import { BigNumber } from '@ethersproject/bignumber';
	import { token, tokenDecimals } from '$lib/derived/token.derived';
	import type { IcToken } from '$icp/types/ic';
	import { nonNullish } from '@dfinity/utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { isTokenCkErc20Ledger, isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
	import { icrcTokens } from '$icp/derived/icrc.derived';

	// IC network fees for ckErc20 tokens have to be paid in ckEth.
	let ckEr20 = false;
	$: ckEr20 = isTokenCkErc20Ledger($token as IcToken);

	let tokenCkEth: IcToken | undefined;
	$: tokenCkEth = ckEr20 ? $icrcTokens.find(isTokenCkEthLedger) : undefined;

	let feeToken: IcToken;
	$: feeToken = tokenCkEth ?? ($token as IcToken);

	let decimals: number;
	let symbol: string;

	$: ({ decimals, symbol } = feeToken);

	let fee: bigint | undefined;
	$: fee = feeToken.fee;
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
