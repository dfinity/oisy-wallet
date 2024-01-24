<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { slide } from 'svelte/transition';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { token, tokenDecimals, tokenId } from '$lib/derived/token.derived';
	import type { IcToken } from '$icp/types/ic';
	import { parseToken } from '$lib/utils/parse.utils';
	import { balance } from '$lib/derived/balances.derived';
	import { BigNumber } from '@ethersproject/bignumber';
	import { BTC_NETWORK_ID } from '$icp/constants/ckbtc.constants';
	import type { NetworkId } from '$lib/types/network';
	import { assertCkBTCUserInputAmount } from '$icp/utils/ckbtc.utils';
	import { IcAmountAssertionError } from '$icp/types/ic-send';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';

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

		if (networkId === BTC_NETWORK_ID) {
			amountError = assertCkBTCUserInputAmount({
				amount: value,
				minterInfo: $ckBtcMinterInfoStore?.[$tokenId],
				tokenDecimals: $tokenDecimals
			});

            if (nonNullish(amountError)) {
                return;
            }
		}

		const total = value.add(fee);

		if (total.gt($balance ?? BigNumber.from(0n))) {
			amountError = new IcAmountAssertionError('Insufficient funds.');
		}
	};

	const debounceValidate = debounce(validate);

	$: amount, fee, debounceValidate();
</script>

<label for="amount" class="font-bold px-4.5">Amount:</label>
<Input
	name="amount"
	inputType="currency"
	required
	bind:value={amount}
	decimals={$tokenDecimals}
	placeholder="Amount"
/>

{#if nonNullish(amountError)}
	<p transition:slide class="text-cyclamen pb-3">{amountError.message}</p>
{/if}
