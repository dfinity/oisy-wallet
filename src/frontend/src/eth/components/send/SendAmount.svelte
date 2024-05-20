<script lang="ts">
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import { type ComponentType, getContext } from 'svelte';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { maxGasFee, minGasFee } from '$eth/utils/fee.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { balancesStore } from '$lib/stores/balances.store';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { InsufficientFundsError } from '$lib/types/send';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';

	export let amount: number | undefined = undefined;
	export let fee: BigNumber | undefined | null = undefined;
	export let insufficientFunds: boolean;

	let insufficientFundsError: InsufficientFundsError | undefined = undefined;

	$: insufficientFunds = nonNullish(insufficientFundsError);

	const { feeStore: storeFeeData } = getContext<FeeContext>(FEE_CONTEXT_KEY);
	const { sendTokenDecimals, sendBalance, sendTokenId, sendToken } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	$: customValidate = (userAmount: BigNumber) => {
		if (isNullish($storeFeeData)) {
			return;
		}

		// If ETH, the balance should cover the user entered amount plus the min gas fee
		if (isSupportedEthTokenId($sendTokenId)) {
			const total = userAmount.add(minGasFee($storeFeeData));

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
		const maxFee = maxGasFee($storeFeeData);
		const ethBalance = $balancesStore?.[$sendToken.id]?.data ?? BigNumber.from(0n);
		if (nonNullish(maxFee) && ethBalance.lt(maxFee)) {
			return new InsufficientFundsError(
				$i18n.send.assertion.insufficient_ethereum_funds_to_cover_the_fees
			);
		}
	};

	$: calculateMax = (): number => {
		return getMaxTransactionAmount({
			balance: $sendBalance?.toBigInt(),
			fee: fee?.toBigInt(),
			tokenDecimals: $sendTokenDecimals,
			tokenId: $sendTokenId
		});
	};

	/**
	 * Reevaluate max amount if user has used the "Max" button and the fees are changing.
	 */
	let amountSetToMax = false;
	let sendInputAmount: SendInputAmount | undefined;

	$: $storeFeeData,
		(() => {
			if (!amountSetToMax) {
				return;
			}

			// TODO: we need the PR that provides the derivation of the fee in the context here
			// Debounce to sync the UI given that the fees' display is animated with a short fade effect.
			debounce(() => sendInputAmount?.triggerCalculateMax(), 1000)();
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
/>
