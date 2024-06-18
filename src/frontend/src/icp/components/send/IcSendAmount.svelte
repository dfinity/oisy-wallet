<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { tokenDecimals } from '$lib/derived/token.derived';
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
	import { isNetworkIdBitcoin, isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { tokenCkErc20Ledger, tokenCkEthLedger } from '$icp/derived/ic-token.derived';
	import { ckEthereumNativeTokenId } from '$icp-eth/derived/cketh.derived';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';
	import { getContext } from 'svelte';
	import {
		ETHEREUM_FEE_CONTEXT_KEY,
		type EthereumFeeContext
	} from '$icp/stores/ethereum-fee.store';
	import { balancesStore } from '$lib/stores/balances.store';
	import { ethereumFeeTokenCkEth } from '$icp/derived/ethereum-fee.derived';
	import { token } from '$lib/stores/token.store';

	export let amount: number | undefined = undefined;
	export let amountError: IcAmountAssertionError | undefined;
	export let networkId: NetworkId | undefined = undefined;

	let fee: bigint | undefined;
	$: fee = ($token as IcToken).fee;

	const { store: ethereumFeeStore } = getContext<EthereumFeeContext>(ETHEREUM_FEE_CONTEXT_KEY);

	$: customValidate = (userAmount: BigNumber): Error | undefined => {
		if (isNullish(fee) || isNullish($token)) {
			return;
		}

		if (isNetworkIdBitcoin(networkId)) {
			const error = assertCkBTCUserInputAmount({
				amount: userAmount,
				minterInfo: $ckBtcMinterInfoStore?.[$token.id],
				tokenDecimals: $token.decimals,
				i18n: $i18n
			});

			if (nonNullish(error)) {
				return error;
			}
		}

		// if CkEth, asset the minimal withdrawal amount is met and the amount should at least be bigger than the fee.
		if (isNetworkIdEthereum(networkId) && $tokenCkEthLedger) {
			const error = assertCkETHMinWithdrawalAmount({
				amount: userAmount,
				tokenDecimals: $token.decimals,
				tokenSymbol: $token.symbol,
				minterInfo: $ckEthMinterInfoStore?.[$ckEthereumNativeTokenId],
				i18n: $i18n
			});

			if (nonNullish(error)) {
				return error;
			}

			return assertCkETHMinFee({
				amount: userAmount,
				tokenSymbol: $token.symbol,
				fee,
				i18n: $i18n
			});
		}

		const assertBalance = (): IcAmountAssertionError | undefined => {
			const total = userAmount.add(fee ?? BigNumber.from(0n));

			if (total.gt($balance ?? BigNumber.from(0n))) {
				return new IcAmountAssertionError($i18n.send.assertion.insufficient_funds);
			}

			return undefined;
		};

		// if CkErc20, the entered amount should be covered by fee + balance and the ckEth balance should cover the estimated fee.
		if (isNetworkIdEthereum(networkId) && $tokenCkErc20Ledger) {
			const error = assertBalance();

			if (nonNullish(error)) {
				return error;
			}

			const errorEstimatedFee = assertCkETHBalanceEstimatedFee({
				balance: nonNullish($ethereumFeeTokenCkEth)
					? $balancesStore?.[$ethereumFeeTokenCkEth.id]?.data
					: undefined,
				tokenCkEth: $ethereumFeeTokenCkEth,
				feeStoreData: $ethereumFeeStore,
				i18n: $i18n
			});

			if (nonNullish(errorEstimatedFee)) {
				return errorEstimatedFee;
			}

			return undefined;
		}

		return assertBalance();
	};

	$: calculateMax = (): number | undefined => {
		return isNullish($token)
			? undefined
			: getMaxTransactionAmount({
					balance: $balance?.toBigInt(),
					fee: fee,
					tokenDecimals: $token.decimals,
					tokenStandard: $token.standard
				});
	};

	let sendInputAmount: SendInputAmount | undefined;
	$: $ethereumFeeStore, (() => sendInputAmount?.triggerValidate())();
</script>

<SendInputAmount
	bind:amount
	bind:this={sendInputAmount}
	tokenDecimals={$tokenDecimals}
	{customValidate}
	{calculateMax}
	bind:error={amountError}
/>
