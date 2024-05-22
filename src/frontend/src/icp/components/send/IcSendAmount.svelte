<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import {
		token,
		tokenDecimals,
		tokenId,
		tokenSymbol,
		tokenStandard
	} from '$lib/derived/token.derived';
	import type { IcToken } from '$icp/types/ic';
	import { balance } from '$lib/derived/balances.derived';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { NetworkId } from '$lib/types/network';
	import { assertCkBTCUserInputAmount } from '$icp/utils/ckbtc.utils';
	import { IcAmountAssertionError } from '$icp/types/ic-send';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { assertCkEthereumMinFee, assertCkETHMinWithdrawalAmount } from '$icp/utils/cketh.utils';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { isNetworkIdBTC } from '$icp/utils/ic-send.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { tokenCkErc20Ledger, tokenCkEthLedger } from '$icp/derived/ic-token.derived';
	import { ckEthereumNativeTokenId } from '$icp-eth/derived/cketh.derived';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';

	export let amount: number | undefined = undefined;
	export let amountError: IcAmountAssertionError | undefined;
	export let networkId: NetworkId | undefined = undefined;

	let fee: bigint | undefined;
	$: fee = ($token as IcToken).fee;

	$: customValidate = (userAmount: BigNumber): Error | undefined => {
		if (isNullish(fee)) {
			return;
		}

		if (isNetworkIdBTC(networkId)) {
			let error = assertCkBTCUserInputAmount({
				amount: userAmount,
				minterInfo: $ckBtcMinterInfoStore?.[$tokenId],
				tokenDecimals: $tokenDecimals,
				i18n: $i18n
			});

			if (nonNullish(error)) {
				return error;
			}
		}

		if (isNetworkIdEthereum(networkId) && $tokenCkEthLedger) {
			let error = assertCkETHMinWithdrawalAmount({
				amount: userAmount,
				tokenDecimals: $tokenDecimals,
				tokenSymbol: $tokenSymbol,
				minterInfo: $ckEthMinterInfoStore?.[$ckEthereumNativeTokenId],
				i18n: $i18n
			});

			if (nonNullish(error)) {
				return error;
			}
		}

		if (isNetworkIdEthereum(networkId) && $tokenCkErc20Ledger) {
			// TODO: if ckErc20 -> balance de ckETH >= fee ledger ckEth + estimated ethereum fee
			// maxTransactionFeePlusEthLedgerApprove
		}

		if (isNetworkIdEthereum(networkId)) {
			return assertCkEthereumMinFee({
				amount: userAmount,
				tokenSymbol: $tokenSymbol,
				fee,
				i18n: $i18n
			});
		}

		const total = userAmount.add(fee);

		if (total.gt($balance ?? BigNumber.from(0n))) {
			return new IcAmountAssertionError($i18n.send.assertion.insufficient_funds);
		}

		return;
	};

	$: calculateMax = (): number => {
		return getMaxTransactionAmount({
			balance: $balance?.toBigInt(),
			fee: fee,
			tokenDecimals: $tokenDecimals,
			tokenStandard: $tokenStandard
		});
	};
</script>

<SendInputAmount
	bind:amount
	tokenDecimals={$tokenDecimals}
	{customValidate}
	{calculateMax}
	bind:error={amountError}
/>
