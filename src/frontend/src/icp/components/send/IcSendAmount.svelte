<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { token, tokenDecimals, tokenId, tokenSymbol } from '$lib/derived/token.derived';
	import type { IcToken } from '$icp/types/ic';
	import { balance } from '$lib/derived/balances.derived';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { NetworkId } from '$lib/types/network';
	import { assertCkBTCUserInputAmount } from '$icp/utils/ckbtc.utils';
	import { IcAmountAssertionError } from '$icp/types/ic-send';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { assertCkETHMinFee, assertCkETHMinWithdrawalAmount } from '$icp/utils/cketh.utils';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { isNetworkIdBTC } from '$icp/utils/ic-send.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { tokenCkEthLedger } from '$icp/derived/ic-token.derived';
	import { ckEthereumNativeTokenId } from '$icp-eth/derived/cketh.derived';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { invalidAmount } from '$lib/utils/input.utils';

	export let amount: number | undefined = undefined;
	export let amountError: IcAmountAssertionError | undefined;
	export let networkId: NetworkId | undefined = undefined;

	let fee: bigint | undefined;
	$: fee = ($token as IcToken).fee;

	const validate = (value: BigNumber) => {
		if (invalidAmount(amount)) {
			return;
		}

		if (isNullish(fee)) {
			return;
		}

		amountError = undefined;

		if (isNetworkIdBTC(networkId)) {
			amountError = assertCkBTCUserInputAmount({
				amount: value,
				minterInfo: $ckBtcMinterInfoStore?.[$tokenId],
				tokenDecimals: $tokenDecimals,
				i18n: $i18n
			});
		} else if (isNetworkIdEthereum(networkId)) {
			if ($tokenCkEthLedger) {
				amountError = assertCkETHMinWithdrawalAmount({
					amount: value,
					tokenDecimals: $tokenDecimals,
					tokenSymbol: $tokenSymbol,
					minterInfo: $ckEthMinterInfoStore?.[$ckEthereumNativeTokenId],
					i18n: $i18n
				});
			} else {
				amountError = assertCkETHMinFee({
					amount: value,
					tokenSymbol: $tokenSymbol,
					fee,
					i18n: $i18n
				});
			}
		} else {
			const total = value.add(fee);
			if (total.gt($balance ?? BigNumber.from(0n))) {
				amountError = new IcAmountAssertionError($i18n.send.assertion.insufficient_funds);
			}
		}

		return amountError;
	};

	const customValidations = [validate];

	let reactivityVariables: (unknown | undefined)[];
	$: reactivityVariables = [fee, $ckBtcMinterInfoStore, $ckEthMinterInfoStore];
</script>

<SendInputAmount
	bind:amount
	tokenDecimals={$tokenDecimals}
	{customValidations}
	{reactivityVariables}
/>
