<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { KASPA_MAINNET_TOKEN, KASPA_TESTNET_TOKEN } from '$env/tokens/tokens.kaspa.env';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { InsufficientFundsError, type OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { isNetworkIdKASTestnet } from '$lib/utils/network.utils';
	import { type KaspaFeeContext, KASPA_FEE_CONTEXT_KEY } from '$kaspa/stores/kaspa-fee.store';
	import { KaspaAmountAssertionError, KASPA_DUST_THRESHOLD } from '$kaspa/types/kaspa-send';

	interface Props {
		amount: OptionAmount;
		amountError?: KaspaAmountAssertionError;
		onTokensList: () => void;
	}

	let { amount = $bindable(), amountError = $bindable(), onTokensList }: Props = $props();

	let exchangeValueUnit = $state<DisplayUnit>('usd');

	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');

	const { sendToken, sendBalance, sendTokenStandard, sendTokenNetworkId, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	const { feeStore: fee }: KaspaFeeContext = getContext<KaspaFeeContext>(KASPA_FEE_CONTEXT_KEY);

	let kaspaNativeToken = $derived(
		isNetworkIdKASTestnet($sendTokenNetworkId) ? KASPA_TESTNET_TOKEN : KASPA_MAINNET_TOKEN
	);

	const customValidate = (userAmount: bigint): Error | undefined => {
		if (invalidAmount(Number(userAmount)) || userAmount === ZERO) {
			return new KaspaAmountAssertionError($i18n.send.assertion.amount_invalid);
		}

		// Check dust threshold (546 sompi)
		if (userAmount < KASPA_DUST_THRESHOLD) {
			return new KaspaAmountAssertionError($i18n.send.assertion.amount_invalid);
		}

		// For native KAS token, check if balance covers amount + fee
		if (nonNullish($sendBalance) && $sendTokenStandard.code === 'kaspa') {
			const total = userAmount + ($fee ?? ZERO);

			if (total > $sendBalance) {
				return new InsufficientFundsError($i18n.send.assertion.insufficient_funds_for_gas);
			}

			return;
		}

		if (userAmount > ($sendBalance ?? ZERO)) {
			return new InsufficientFundsError($i18n.send.assertion.insufficient_funds);
		}

		// Check if we have enough KAS to cover fees
		const kaspaBalance = $balancesStore?.[kaspaNativeToken.id]?.data ?? ZERO;
		if (nonNullish($fee) && kaspaBalance < $fee) {
			return new InsufficientFundsError($i18n.send.assertion.insufficient_funds_for_gas);
		}
	};
</script>

<div class="mb-4">
	<TokenInput
		autofocus={nonNullish($sendToken)}
		displayUnit={inputUnit}
		exchangeRate={$sendTokenExchangeRate}
		onClick={onTokensList}
		onCustomErrorValidate={customValidate}
		token={$sendToken}
		bind:amount
		bind:error={amountError}
	>
		{#snippet title()}{$i18n.core.text.amount}{/snippet}

		{#snippet amountInfo()}
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
		{/snippet}

		{#snippet balance()}
			{#if nonNullish($sendToken)}
				<MaxBalanceButton
					balance={$sendBalance}
					error={nonNullish(amountError)}
					fee={$fee ?? ZERO}
					token={$sendToken}
					bind:amount
				/>
			{/if}
		{/snippet}
	</TokenInput>
</div>
