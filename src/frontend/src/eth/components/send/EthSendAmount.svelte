<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { Utils } from 'alchemy-sdk';
	import { getContext } from 'svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { InsufficientFundsError, type OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';

	export let amount: OptionAmount = undefined;
	export let insufficientFunds: boolean;
	export let nativeEthereumToken: Token;

	let exchangeValueUnit: DisplayUnit = 'usd';
	let inputUnit: DisplayUnit;
	$: inputUnit = exchangeValueUnit === 'token' ? 'usd' : 'token';

	let insufficientFundsError: InsufficientFundsError | undefined = undefined;

	$: insufficientFunds = nonNullish(insufficientFundsError);

	const { feeStore: storeFeeData, minGasFee, maxGasFee } = getContext<FeeContext>(FEE_CONTEXT_KEY);
	const { sendTokenDecimals, sendBalance, sendTokenId, sendToken, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	$: customValidate = (userAmount: BigNumber): Error | undefined => {
		if (isNullish($storeFeeData)) {
			return;
		}

		// We should align the $sendBalance and userAmount to avoid issues caused by comparing formatted and unformatted BN
		const parsedSendBalance = nonNullish($sendBalance)
			? Utils.parseUnits(
					formatToken({
						value: $sendBalance.toBigInt(),
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

	/**
	 * Reevaluate max amount if user has used the "Max" button and the fees are changing.
	 */
	let amountSetToMax = false;
</script>

<div class="mb-4">
	<TokenInput
		token={$sendToken}
		bind:amount
		displayUnit={inputUnit}
		bind:amountSetToMax
		isSelectable={false}
		exchangeRate={$sendTokenExchangeRate}
		bind:error={insufficientFundsError}
		customErrorValidate={customValidate}
		autofocus={nonNullish($sendToken)}
	>
		<span slot="title">{$i18n.core.text.amount}</span>

		<svelte:fragment slot="amount-info">
			{#if nonNullish($sendToken)}
				<div class="text-tertiary">
					<TokenInputAmountExchange
						{amount}
						exchangeRate={$sendTokenExchangeRate}
						token={$sendToken}
						bind:displayUnit={exchangeValueUnit}
					/>
				</div>
			{/if}
		</svelte:fragment>

		<svelte:fragment slot="balance">
			{#if nonNullish($sendToken)}
				<MaxBalanceButton
					bind:amount
					bind:amountSetToMax
					error={nonNullish(insufficientFundsError)}
					balance={$sendBalance}
					token={$sendToken}
					fee={$maxGasFee}
				/>
			{/if}
		</svelte:fragment>
	</TokenInput>
</div>
