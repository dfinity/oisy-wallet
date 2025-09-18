<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import { IcAmountAssertionError } from '$icp/types/ic-send';
	import type { OptionIcToken } from '$icp/types/ic-token';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';

	interface Props {
		amount?: OptionAmount;
		amountError: IcAmountAssertionError | undefined;
	}

	let { amount = $bindable(), amountError = $bindable() }: Props = $props();

	const dispatch = createEventDispatcher();

	const { sendToken, sendTokenExchangeRate, sendBalance } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let fee: bigint | undefined = $derived(($sendToken as OptionIcToken)?.fee);

	let exchangeValueUnit: DisplayUnit = $state('usd');
	let inputUnit: DisplayUnit = $derived(exchangeValueUnit === 'token' ? 'usd' : 'token');

	const customValidate = (userAmount: bigint): Error | undefined => {
		if (isNullish(fee) || isNullish($sendToken)) {
			return;
		}

		const assertBalance = (): IcAmountAssertionError | undefined => {
			const total = userAmount + (fee ?? ZERO);

			if (total > ($sendBalance ?? ZERO)) {
				return new IcAmountAssertionError($i18n.send.assertion.insufficient_funds);
			}

			return undefined;
		};

		return assertBalance();
	};
</script>

<div class="mb-4">
	<TokenInput
		autofocus={nonNullish($sendToken)}
		customErrorValidate={customValidate}
		displayUnit={inputUnit}
		exchangeRate={$sendTokenExchangeRate}
		token={$sendToken}
		bind:amount
		bind:error={amountError}
		on:click={() => {
			dispatch('icTokensList');
		}}
	>
		{#snippet title()}
			<span>{$i18n.core.text.amount}</span>
		{/snippet}

		<!-- @migration-task: migrate this slot by hand, `amount-info` is an invalid identifier -->
		<!-- @migration-task: migrate this slot by hand, `amount-info` is an invalid identifier -->
		<!-- @migration-task: migrate this slot by hand, `amount-info` is an invalid identifier -->
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

		{#snippet balance()}
			{#if nonNullish($sendToken)}
				<MaxBalanceButton
					balance={$sendBalance}
					error={nonNullish(amountError)}
					fee={fee ?? ZERO}
					token={$sendToken}
					bind:amount
				/>
			{/if}
		{/snippet}
	</TokenInput>
</div>
