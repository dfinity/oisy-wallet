<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from 'alchemy-sdk';
	import { getContext } from 'svelte';
	import {
		SOLANA_DEVNET_TOKEN,
		SOLANA_LOCAL_TOKEN,
		SOLANA_TESTNET_TOKEN,
		SOLANA_TOKEN
	} from '$env/tokens/tokens.sol.env';
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
	import { invalidAmount } from '$lib/utils/input.utils';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLTestnet
	} from '$lib/utils/network.utils';
	import { type FeeContext, SOL_FEE_CONTEXT_KEY } from '$sol/stores/sol-fee.store';
	import { SolAmountAssertionError } from '$sol/types/sol-send';

	export let amount: OptionAmount = undefined;
	export let amountError: SolAmountAssertionError | undefined;

	let exchangeValueUnit: DisplayUnit = 'usd';
	let inputUnit: DisplayUnit;
	$: inputUnit = exchangeValueUnit === 'token' ? 'usd' : 'token';

	const { sendToken, sendBalance, sendTokenStandard, sendTokenNetworkId, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	const { feeStore: fee }: FeeContext = getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	let solanaNativeToken: Token;
	$: solanaNativeToken = isNetworkIdSOLTestnet($sendTokenNetworkId)
		? SOLANA_TESTNET_TOKEN
		: isNetworkIdSOLDevnet($sendTokenNetworkId)
			? SOLANA_DEVNET_TOKEN
			: isNetworkIdSOLLocal($sendTokenNetworkId)
				? SOLANA_LOCAL_TOKEN
				: SOLANA_TOKEN;

	$: customValidate = (userAmount: BigNumber): Error | undefined => {
		if (invalidAmount(userAmount.toNumber()) || userAmount.isZero()) {
			return new SolAmountAssertionError($i18n.send.assertion.amount_invalid);
		}

		if (nonNullish($sendBalance) && $sendTokenStandard === 'solana') {
			const total = userAmount.add($fee ?? ZERO);

			if (total.gt($sendBalance)) {
				return new InsufficientFundsError($i18n.send.assertion.insufficient_funds_for_gas);
			}

			return;
		}

		if (userAmount.gt($sendBalance ?? ZERO)) {
			return new InsufficientFundsError($i18n.send.assertion.insufficient_funds);
		}

		const solBalance = $balancesStore?.[solanaNativeToken.id]?.data ?? ZERO;
		if (nonNullish($fee) && solBalance.lt($fee)) {
			return new InsufficientFundsError(
				$i18n.send.assertion.insufficient_solana_funds_to_cover_the_fees
			);
		}
	};
</script>

<TokenInput
	token={$sendToken}
	bind:amount
	displayUnit={inputUnit}
	isSelectable={false}
	exchangeRate={$sendTokenExchangeRate}
	bind:error={amountError}
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
				error={nonNullish(amountError)}
				balance={$sendBalance}
				token={$sendToken}
				fee={BigNumber.from($fee ?? 0)}
			/>
		{/if}
	</svelte:fragment>
</TokenInput>
