<script lang="ts">
	import { formatToken } from '$lib/utils/format.utils.js';
	import Value from '$lib/components/ui/Value.svelte';
	import { BigNumber } from '@ethersproject/bignumber';
	import { token, tokenDecimals } from '$lib/derived/token.derived';
	import type { IcCkToken, IcToken } from '$icp/types/ic';
	import { nonNullish } from '@dfinity/utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import type { LedgerCanisterIdText } from '$icp/types/canister';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';
	import type { NetworkId } from '$lib/types/network';
	import type { Token } from '$lib/types/token';

	export let networkId: NetworkId | undefined = undefined;

	// IC network fees to convert ckErc20 to Erc20 have to be paid in ckEth.
	// IC network fees to transfer ckErc20 to ckErc20 have to be paid in ckErc20.
	let ethNetwork = false;
	$: ethNetwork = isNetworkIdEthereum(networkId);

	let feeLedgerCanisterId: LedgerCanisterIdText | undefined;
	$: feeLedgerCanisterId = ($token as IcCkToken).feeLedgerCanisterId;

	let tokenCkEth: IcToken | undefined;
	$: tokenCkEth = nonNullish(feeLedgerCanisterId)
		? $icrcTokens.find(({ ledgerCanisterId }) => ledgerCanisterId === feeLedgerCanisterId)
		: undefined;

	let feeToken: Token;
	$: feeToken = ethNetwork ? tokenCkEth ?? $token : $token;

	let decimals: number;
	let symbol: string;

	$: ({ decimals, symbol } = feeToken);

	let fee: bigint | undefined;
	$: fee = (feeToken as IcToken).fee;
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
