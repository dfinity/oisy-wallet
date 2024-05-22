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
	import {
		assertCkETHBalanceEstimatedFee,
		assertCkETHMinFee,
		assertCkETHMinWithdrawalAmount
	} from '$icp/utils/cketh.utils';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { isNetworkIdBTC } from '$icp/utils/ic-send.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { tokenCkErc20Ledger, tokenCkEthLedger } from '$icp/derived/ic-token.derived';
	import {
		ckEthereumNativeToken,
		ckEthereumNativeTokenBalance,
		ckEthereumNativeTokenId
	} from '$icp-eth/derived/cketh.derived';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';
	import { getContext } from 'svelte';
	import {
		ETHEREUM_FEE_CONTEXT_KEY,
		type EthereumFeeContext
	} from '$icp/stores/ethereum-fee.store';

	export let amount: number | undefined = undefined;
	export let amountError: IcAmountAssertionError | undefined;
	export let networkId: NetworkId | undefined = undefined;

	let fee: bigint | undefined;
	$: fee = ($token as IcToken).fee;

	const { store } = getContext<EthereumFeeContext>(ETHEREUM_FEE_CONTEXT_KEY);

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
			let error = assertCkETHBalanceEstimatedFee({
				balance: $ckEthereumNativeTokenBalance,
				tokenDecimals: $ckEthereumNativeToken.decimals,
				tokenSymbol: $ckEthereumNativeToken.symbol,
				feeStoreData: $store,
				i18n: $i18n
			});

			if (nonNullish(error)) {
				return error;
			}
		}

		if (isNetworkIdEthereum(networkId)) {
			return assertCkETHMinFee({
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
