<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { slide } from 'svelte/transition';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { token, tokenDecimals, tokenId, tokenSymbol } from '$lib/derived/token.derived';
	import type { IcToken } from '$icp/types/ic';
	import { parseToken } from '$lib/utils/parse.utils';
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

	export let amount: number | undefined = undefined;
	export let amountError: IcAmountAssertionError | undefined;
	export let networkId: NetworkId | undefined = undefined;

	let fee: bigint | undefined;
	$: fee = ($token as IcToken).fee;

	const validate = () => {
		if (invalidAmount(amount)) {
			amountError = undefined;
			return;
		}

		if (isNullish(fee)) {
			amountError = undefined;
			return;
		}

		const value = parseToken({
			value: `${amount}`,
			unitName: $tokenDecimals
		});

		if (isNetworkIdBTC(networkId)) {
			amountError = assertCkBTCUserInputAmount({
				amount: value,
				minterInfo: $ckBtcMinterInfoStore?.[$tokenId],
				tokenDecimals: $tokenDecimals,
				i18n: $i18n
			});

			if (nonNullish(amountError)) {
				return;
			}
		}

		if (isNetworkIdEthereum(networkId) && $tokenCkEthLedger) {
			amountError = assertCkETHMinWithdrawalAmount({
				amount: value,
				tokenDecimals: $tokenDecimals,
				tokenSymbol: $tokenSymbol,
				minterInfo: $ckEthMinterInfoStore?.[$tokenId],
				i18n: $i18n
			});

			if (nonNullish(amountError)) {
				return;
			}
		}

		if (isNetworkIdEthereum(networkId)) {
			amountError = assertCkETHMinFee({
				amount: value,
				tokenSymbol: $tokenSymbol,
				fee,
				i18n: $i18n
			});
			return;
		}

		const total = value.add(fee);

		if (total.gt($balance ?? BigNumber.from(0n))) {
			amountError = new IcAmountAssertionError($i18n.send.assertion.insufficient_funds);
			return;
		}

		amountError = undefined;
	};

	const debounceValidate = debounce(validate);

	$: amount, fee, $ckBtcMinterInfoStore, $ckEthMinterInfoStore, debounceValidate();
</script>

<label for="amount" class="font-bold px-4.5">{$i18n.core.text.amount}:</label>
<Input
	name="amount"
	inputType="currency"
	required
	bind:value={amount}
	decimals={$tokenDecimals}
	placeholder={$i18n.core.text.amount}
	spellcheck={false}
/>

{#if nonNullish(amountError)}
	<p transition:slide={{ duration: 250 }} class="text-cyclamen pb-3">{amountError.message}</p>
{/if}
