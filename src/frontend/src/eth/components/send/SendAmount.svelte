<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import { getContext } from 'svelte';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { maxGasFee, minGasFee } from '$eth/utils/fee.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { slide } from 'svelte/transition';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { balancesStore } from '$lib/stores/balances.store';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { ethereumTokenId } from '$eth/derived/token.derived';

	export let amount: number | undefined = undefined;
	export let insufficientFunds: boolean;

	let insufficientFundsError: string | undefined;

	$: insufficientFunds = nonNullish(insufficientFundsError);

	const { feeStore: storeFeeData } = getContext<FeeContext>(FEE_CONTEXT_KEY);
	const { sendTokenDecimals, sendBalance, sendTokenId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const validate = () => {
		if (invalidAmount(amount)) {
			insufficientFundsError = undefined;
			return;
		}

		if (isNullish($storeFeeData)) {
			insufficientFundsError = undefined;
			return;
		}

		const userAmount = parseToken({
			value: `${amount}`,
			unitName: $sendTokenDecimals
		});

		// If ETH, the balance should cover the user entered amount plus the min gas fee
		if (isSupportedEthTokenId($sendTokenId)) {
			const total = userAmount.add(minGasFee($storeFeeData));

			if (total.gt($sendBalance ?? BigNumber.from(0n))) {
				insufficientFundsError = $i18n.send.assertion.insufficient_funds_for_gas;
				return;
			}

			insufficientFundsError = undefined;
			return;
		}

		// If ERC20, the balance of the token - e.g. 20 DAI - should cover the amount entered by the user
		if (userAmount.gt($sendBalance ?? BigNumber.from(0n))) {
			insufficientFundsError = $i18n.send.assertion.insufficient_funds_for_amount;
			return;
		}
		// Finally, if ERC20, the ETH balance should be less or greater than the max gas fee
		const maxFee = maxGasFee($storeFeeData);
		const ethBalance = $balancesStore?.[$ethereumTokenId]?.data ?? BigNumber.from(0n);

		if (nonNullish(maxFee) && ethBalance.lt(maxFee)) {
			insufficientFundsError = $i18n.send.assertion.insufficient_ethereum_funds_to_cover_the_fees;
			return;
		}

		insufficientFundsError = undefined;
	};

	const debounceValidate = debounce(validate);

	$: amount, $storeFeeData, debounceValidate();
</script>

<label for="amount" class="font-bold px-4.5">{$i18n.core.text.amount}:</label>
<Input
	name="amount"
	inputType="currency"
	required
	bind:value={amount}
	decimals={$sendTokenDecimals}
	placeholder={$i18n.core.text.amount}
/>

{#if insufficientFunds}
	<p transition:slide={{ duration: 250 }} class="text-cyclamen pb-3">{insufficientFundsError}</p>
{/if}
