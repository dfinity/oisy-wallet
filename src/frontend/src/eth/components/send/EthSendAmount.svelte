<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { Utils } from 'alchemy-sdk';
	import { getContext } from 'svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { InsufficientFundsError, type OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';

	export let amount: OptionAmount = undefined;
	export let insufficientFunds: boolean;
	export let nativeEthereumToken: Token;

	let insufficientFundsError: InsufficientFundsError | undefined = undefined;

	$: insufficientFunds = nonNullish(insufficientFundsError);

	const {
		feeStore: storeFeeData,
		minGasFee,
		maxGasFee,
		evaluateFee
	} = getContext<FeeContext>(FEE_CONTEXT_KEY);
	const { sendTokenDecimals, sendBalance, sendTokenId, sendTokenStandard } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	$: customValidate = (userAmount: BigNumber): Error | undefined => {
		if (isNullish($storeFeeData)) {
			return;
		}

		// We should align the $sendBalance and userAmount to avoid issues caused by comparing formatted and unformatted BN
		const parsedSendBalance = nonNullish($sendBalance)
			? Utils.parseUnits(
					formatToken({
						value: $sendBalance,
						unitName: $sendTokenDecimals,
						displayDecimals: $sendTokenDecimals
					}),
					$sendTokenDecimals
				)
			: ZERO;

		// If ETH, the balance should cover the user entered amount plus the min gas fee
		if (isSupportedEthTokenId($sendTokenId)) {
			const total = userAmount.add($minGasFee ?? ZERO);

			if (total.gt(parsedSendBalance)) {
				return new InsufficientFundsError($i18n.send.assertion.insufficient_funds_for_gas);
			}

			return;
		}

		// If ERC20, the balance of the token - e.g. 20 DAI - should cover the amount entered by the user
		if (userAmount.gt(parsedSendBalance)) {
			return new InsufficientFundsError($i18n.send.assertion.insufficient_funds_for_amount);
		}

		// Finally, if ERC20, the ETH balance should be less or greater than the max gas fee
		const ethBalance = $balancesStore?.[nativeEthereumToken.id]?.data ?? ZERO;
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
					balance: $sendBalance ?? ZERO,
					fee: $maxGasFee,
					tokenDecimals: $sendTokenDecimals,
					tokenStandard: $sendTokenStandard
				});

	const onInput = () => evaluateFee?.();

	/**
	 * Reevaluate max amount if user has used the "Max" button and the fees are changing.
	 */
	let amountSetToMax = false;
	let sendInputAmount: SendInputAmount | undefined;

	$: $maxGasFee,
		(() => {
			if (!amountSetToMax) {
				return;
			}

			// Debounce to sync the UI given that the fees' display is animated with a short fade effect.
			debounce(() => sendInputAmount?.triggerCalculateMax(), 500)();
		})();
</script>

<SendInputAmount
	bind:amount
	bind:amountSetToMax
	bind:this={sendInputAmount}
	tokenDecimals={$sendTokenDecimals}
	{customValidate}
	{calculateMax}
	bind:error={insufficientFundsError}
	on:nnsInput={onInput}
/>
