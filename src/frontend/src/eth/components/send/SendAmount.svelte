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
	import { SUPPORTED_ETHEREUM_TOKEN_IDS } from '$env/tokens.env';
	import { balancesStore } from '$lib/stores/balances.store';
	import { ethereumTokenId } from '$eth/derived/token.derived';

	export let amount: number | undefined = undefined;
	export let insufficientFunds: boolean;

	let insufficientFundsError: string | undefined;

	$: insufficientFunds = nonNullish(insufficientFundsError);

	const { store: storeFeeData } = getContext<FeeContext>(FEE_CONTEXT_KEY);
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
		if (SUPPORTED_ETHEREUM_TOKEN_IDS.includes($sendTokenId)) {
			const total = userAmount.add(minGasFee($storeFeeData));

			if (total.gt($sendBalance ?? BigNumber.from(0n))) {
				insufficientFundsError = 'Insufficient funds for gas';
				return;
			}

			insufficientFundsError = undefined;
			return;
		}

		// If ERC20, the balance of the token - e.g. 20 DAI - should cover the amount entered by the user
		if (userAmount.gt($sendBalance ?? BigNumber.from(0n))) {
			insufficientFundsError = 'Insufficient funds for amount';
			return;
		}

		// Finally, if ERC20, the ETH balance should be less or greater than the max gas fee
		const maxFee = maxGasFee($storeFeeData);
		const ethBalance = $balancesStore?.[$ethereumTokenId]?.data ?? BigNumber.from(0n);
		if (nonNullish(maxFee) && ethBalance.lt(maxFee)) {
			insufficientFundsError = 'Insufficient Ethereum funds to cover the fees';
			return;
		}

		insufficientFundsError = undefined;
	};

	const debounceValidate = debounce(validate);

	$: amount, $storeFeeData, debounceValidate();
</script>

<label for="amount" class="font-bold px-4.5">Amount:</label>
<Input
	name="amount"
	inputType="currency"
	required
	bind:value={amount}
	decimals={$sendTokenDecimals}
	placeholder="Amount"
/>

{#if insufficientFunds}
	<p transition:slide={{ duration: 250 }} class="text-cyclamen pb-3">{insufficientFundsError}</p>
{/if}
