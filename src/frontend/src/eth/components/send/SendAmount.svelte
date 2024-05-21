<script lang="ts">
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import { getContext } from 'svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { balancesStore } from '$lib/stores/balances.store';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { InsufficientFundsError } from '$lib/types/send';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';

	export let amount: number | undefined = undefined;
	export let insufficientFunds: boolean;

	let insufficientFundsError: InsufficientFundsError | undefined = undefined;

	$: insufficientFunds = nonNullish(insufficientFundsError);

	const {
		feeStore: storeFeeData,
		minGasFee,
		maxGasFee,
		evaluateFee
	} = getContext<FeeContext>(FEE_CONTEXT_KEY);
	const { sendTokenDecimals, sendBalance, sendTokenId, sendToken } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	$: customValidate = (userAmount: BigNumber) => {
		if (isNullish($storeFeeData)) {
			return;
		}

		// If ETH, the balance should cover the user entered amount plus the min gas fee
		if (isSupportedEthTokenId($sendTokenId)) {
			const total = userAmount.add($minGasFee ?? BigNumber.from(0));

			if (total.gt($sendBalance ?? BigNumber.from(0n))) {
				return new InsufficientFundsError($i18n.send.assertion.insufficient_funds_for_gas);
			}

			return;
		}

		// If ERC20, the balance of the token - e.g. 20 DAI - should cover the amount entered by the user
		if (userAmount.gt($sendBalance ?? BigNumber.from(0n))) {
			return new InsufficientFundsError($i18n.send.assertion.insufficient_funds_for_amount);
		}

		// Finally, if ERC20, the ETH balance should be less or greater than the max gas fee
		const ethBalance = $balancesStore?.[$sendToken.id]?.data ?? BigNumber.from(0n);
		if (nonNullish($maxGasFee) && ethBalance.lt($maxGasFee)) {
			return new InsufficientFundsError(
				$i18n.send.assertion.insufficient_ethereum_funds_to_cover_the_fees
			);
		}
	};

	let calculateMax: (() => number | undefined) | undefined;
    $: calculateMax = isNullish($maxGasFee)
        ? undefined
        : (): number =>
            getMaxTransactionAmount({
                balance: $sendBalance?.toBigInt(),
                fee: $maxGasFee.toBigInt(),
                tokenDecimals: $sendTokenDecimals,
                tokenId: $sendTokenId
            });

	const onInput = () => evaluateFee?.();
</script>

<SendInputAmount
	bind:amount
	tokenDecimals={$sendTokenDecimals}
	{customValidate}
	{calculateMax}
	bind:error={insufficientFundsError}
	on:nnsInput={onInput}
/>
