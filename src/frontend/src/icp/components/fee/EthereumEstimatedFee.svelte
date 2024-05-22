<script lang="ts">
	import { slide, fade } from 'svelte/transition';
	import { nonNullish } from '@dfinity/utils';
	import Value from '$lib/components/ui/Value.svelte';
	import { formatToken } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import { ckEthereumNativeToken } from '$icp-eth/derived/cketh.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		ETHEREUM_FEE_CONTEXT_KEY,
		type EthereumFeeContext
	} from '$icp/stores/ethereum-fee.store';
	import { isTokenCkErc20Ledger } from '$icp/utils/ic-send.utils';
	import { token } from '$lib/derived/token.derived';
	import type { IcCkToken, IcToken } from '$icp/types/ic';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import type { LedgerCanisterIdText } from '$icp/types/canister';

	let ckEr20 = false;
	$: ckEr20 = isTokenCkErc20Ledger($token as IcToken);

	let feeLedgerCanisterId: LedgerCanisterIdText | undefined;
	$: feeLedgerCanisterId = ($token as IcCkToken).feeLedgerCanisterId;

	let tokenCkEth: IcToken | undefined;
	$: tokenCkEth = nonNullish(feeLedgerCanisterId)
		? $icrcTokens.find(({ ledgerCanisterId }) => ledgerCanisterId === feeLedgerCanisterId)
		: undefined;

	let feeSymbol: string;
	$: feeSymbol = ckEr20
		? tokenCkEth?.symbol ?? $ckEthereumNativeToken.symbol
		: $ckEthereumNativeToken.symbol;

	const { store } = getContext<EthereumFeeContext>(ETHEREUM_FEE_CONTEXT_KEY);

	let maxTransactionFee: bigint | undefined | null = undefined;
	$: maxTransactionFee = $store?.maxTransactionFee;
</script>

{#if nonNullish($store)}
	<div transition:slide={{ duration: 250 }}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label">{$i18n.fee.text.estimated_eth}</svelte:fragment>

			<div>
				&ZeroWidthSpace;
				{#if nonNullish(maxTransactionFee)}
					<span in:fade>
						{formatToken({
							value: BigNumber.from(maxTransactionFee),
							displayDecimals: EIGHT_DECIMALS
						})}
						{feeSymbol}
					</span>
				{/if}
			</div>
		</Value>
	</div>
{/if}
