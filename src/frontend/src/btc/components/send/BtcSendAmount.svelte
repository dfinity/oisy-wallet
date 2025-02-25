<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { BigNumber } from 'alchemy-sdk';
	import { getContext } from 'svelte';
	import { type BtcSendErrorType } from '$btc/types/btc-send';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';

	export let amount: OptionAmount = undefined;
	export let errorType: BtcSendErrorType = undefined;

	const { sendBalance, sendToken, sendTokenExchangeRate, isSendTokenIcrc2 } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	// TODO: Enable Max button by passing the `calculateMax` prop - https://dfinity.atlassian.net/browse/GIX-3114

	$: customValidate = (userAmount: BigNumber): BtcSendErrorType => {
		// calculate-UTXOs-fee endpoint only accepts "userAmount > 0"
		if (invalidAmount(userAmount.toNumber()) || userAmount.isZero()) {
			return 'invalid-amount';
		}

		if (userAmount.gt($sendBalance ?? ZERO)) {
			return 'insufficient-funds';
		}
	};
</script>

<TokenInput
	token={$sendToken}
	bind:amount
	isSelectable={false}
	exchangeRate={$sendTokenExchangeRate}
	bind:errorType
	{customValidate}
>
	<span slot="title">{$i18n.core.text.amount}</span>

	<svelte:fragment slot="amount-info">
		{#if nonNullish($sendToken)}
			<div class="text-tertiary">
				<TokenInputAmountExchange
					{amount}
					exchangeRate={$sendTokenExchangeRate}
					token={$sendToken}
					disabled
				/>
			</div>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="balance">
		{#if nonNullish($sendToken)}
			<MaxBalanceButton
				bind:amount
				balance={$sendBalance}
				token={$sendToken}
				isIcrc2Token={$isSendTokenIcrc2}
				{errorType}
			/>
		{/if}
	</svelte:fragment>
</TokenInput>
