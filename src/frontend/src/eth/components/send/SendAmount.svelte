<script lang="ts">
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import { getContext } from 'svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { maxGasFee, minGasFee } from '$eth/utils/fee.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { balancesStore } from '$lib/stores/balances.store';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { AmountAssertionError, InsufficientFundsError } from '$lib/types/send';

	export let amount: number | undefined = undefined;
	export let insufficientFunds: boolean;
	export let nativeEthereumToken: Token;

	let amountError: AmountAssertionError | undefined = undefined;

	$: insufficientFunds = nonNullish(amountError);

	const { feeStore: storeFeeData } = getContext<FeeContext>(FEE_CONTEXT_KEY);
	const { sendTokenDecimals, sendBalance, sendTokenId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const validate = (value: BigNumber) => {
		if (invalidAmount(amount)) {
			return;
		}

		if (isNullish($storeFeeData)) {
			return;
		}

		let insufficientFundsMessage: string | undefined = undefined;

		// If ETH, the balance should cover the user entered amount plus the min gas fee
		if (isSupportedEthTokenId($sendTokenId)) {
			const total = value.add(minGasFee($storeFeeData));
			if (total.gt($sendBalance ?? BigNumber.from(0n))) {
				insufficientFundsMessage = $i18n.send.assertion.insufficient_funds_for_gas;
			}
		}

		// If ERC20, the balance of the token - e.g. 20 DAI - should cover the amount entered by the user
		else if (value.gt($sendBalance ?? BigNumber.from(0n))) {
			insufficientFundsMessage = $i18n.send.assertion.insufficient_funds_for_amount;
		}

		// Finally, if ERC20, the ETH balance should be less or greater than the max gas fee
		else {
			const maxFee = maxGasFee($storeFeeData);
			const ethBalance = $balancesStore?.[nativeEthereumToken.id]?.data ?? BigNumber.from(0n);
			if (nonNullish(maxFee) && ethBalance.lt(maxFee)) {
				insufficientFundsMessage =
					$i18n.send.assertion.insufficient_ethereum_funds_to_cover_the_fees;
			}
		}

		if (insufficientFundsMessage) {
			amountError = new InsufficientFundsError(insufficientFundsMessage);
		} else {
			amountError = undefined;
		}

		return amountError;
	};

	const customValidations = [validate];

	let reactivityVariables: (unknown | undefined)[];
	$: reactivityVariables = [$storeFeeData];
</script>

<SendInputAmount
	bind:amount
	tokenDecimals={$sendTokenDecimals}
	{customValidations}
	{reactivityVariables}
/>
