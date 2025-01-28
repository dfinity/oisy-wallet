<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { createEventDispatcher, getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import SwapAmountExchange from '$lib/components/swap/SwapAmountExchange.svelte';
	import SwapFees from '$lib/components/swap/SwapFees.svelte';
	import SwapMaxBalanceButton from '$lib/components/swap/SwapMaxBalanceButton.svelte';
	import SwapSelectToken from '$lib/components/swap/SwapSelectToken.svelte';
	import SwapSlippage from '$lib/components/swap/SwapSlippage.svelte';
	import SwapSwitchTokensButton from '$lib/components/swap/SwapSwitchTokensButton.svelte';
	import SwapTokenBalance from '$lib/components/swap/SwapTokenBalance.svelte';
	import SwapValueDifference from '$lib/components/swap/SwapValueDifference.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { SWAP_SLIPPAGE_INVALID_VALUE } from '$lib/constants/swap.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { ConvertAmountErrorType } from '$lib/types/convert';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import { validateConvertAmount } from '$lib/utils/convert.utils';
	import { formatTokenBigintToNumber } from '$lib/utils/format.utils';

	export let swapAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let slippageValue: OptionAmount;

	const {
		sourceToken,
		destinationToken,
		destinationTokenBalance,
		sourceTokenExchangeRate,
		sourceTokenBalance,
		destinationTokenExchangeRate,
		switchTokens
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let errorType: ConvertAmountErrorType = undefined;
	let amountSetToMax = false;
	let exchangeValueUnit: DisplayUnit = 'usd';
	let inputUnit: DisplayUnit;
	$: inputUnit = exchangeValueUnit === 'token' ? 'usd' : 'token';

	$: receiveAmount =
		nonNullish($destinationToken) && $swapAmountsStore?.swapAmounts?.receiveAmount
			? formatTokenBigintToNumber({
					value: $swapAmountsStore?.swapAmounts.receiveAmount,
					unitName: $destinationToken.decimals,
					displayDecimals: $destinationToken.decimals
				})
			: undefined;

	let swapAmountsLoading = false;
	$: swapAmountsLoading =
		nonNullish(swapAmount) && nonNullish($swapAmountsStore?.amountForSwap)
			? Number(swapAmount) !== Number($swapAmountsStore.amountForSwap)
			: false;

	let disableSwitchTokens = false;
	$: disableSwitchTokens =
		(nonNullish(swapAmount) && isNullish(receiveAmount)) || swapAmountsLoading;

	const dispatch = createEventDispatcher();

	let invalid: boolean;
	$: invalid =
		nonNullish(errorType) ||
		isNullish(swapAmount) ||
		Number(swapAmount) <= 0 ||
		isNullish(receiveAmount) ||
		swapAmountsLoading ||
		Number(slippageValue) >= SWAP_SLIPPAGE_INVALID_VALUE;

	const onTokensSwitch = () => {
		const tempAmount = receiveAmount;

		swapAmountsStore.reset();
		amountSetToMax = false;
		swapAmount = tempAmount;

		switchTokens();
	};

	$: customValidate = (userAmount: BigNumber): ConvertAmountErrorType =>
		nonNullish($sourceToken)
			? validateConvertAmount({
					userAmount,
					decimals: $sourceToken.decimals,
					balance: $sourceTokenBalance,
					totalFee: $sourceToken.fee
				})
			: undefined;
</script>

<ContentWithToolbar>
	<div>
		<div class="relative">
			<SwapSelectToken
				bind:amount={swapAmount}
				displayUnit={inputUnit}
				exchangeRate={$sourceTokenExchangeRate}
				bind:errorType
				bind:amountSetToMax
				token={$sourceToken}
				{customValidate}
				on:click={() => {
					dispatch('icShowTokensList', 'source');
				}}
			>
				<span slot="title">{$i18n.swap.text.select_source_token_title}</span>

				<svelte:fragment slot="amount-info">
					{#if nonNullish($sourceToken)}
						<div class="text-tertiary">
							<SwapAmountExchange
								amount={swapAmount}
								exchangeRate={$sourceTokenExchangeRate}
								token={$sourceToken}
								bind:displayUnit={exchangeValueUnit}
							/>
						</div>
					{/if}
				</svelte:fragment>

				<svelte:fragment slot="balance">
					{#if nonNullish($sourceToken)}
						<SwapMaxBalanceButton bind:amountSetToMax bind:swapAmount {errorType} />
					{/if}
				</svelte:fragment>
			</SwapSelectToken>

			<SwapSwitchTokensButton disabled={disableSwitchTokens} on:icSwitchTokens={onTokensSwitch} />

			<SwapSelectToken
				token={$destinationToken}
				amount={receiveAmount}
				displayUnit={inputUnit}
				exchangeRate={$destinationTokenExchangeRate}
				loading={swapAmountsLoading}
				disabled={true}
				on:click={() => {
					dispatch('icShowTokensList', 'destination');
				}}
			>
				<span slot="title">{$i18n.swap.text.select_destination_token_title}</span>

				<svelte:fragment slot="amount-info">
					{#if nonNullish($destinationToken)}
						{#if $swapAmountsStore?.swapAmounts === null}
							<div transition:slide={SLIDE_DURATION} class="text-error"
								>{$i18n.swap.text.swap_is_not_offered}</div
							>
						{:else}
							<div class="flex gap-3 text-tertiary">
								<SwapAmountExchange
									amount={receiveAmount}
									exchangeRate={$destinationTokenExchangeRate}
									token={$destinationToken}
									bind:displayUnit={exchangeValueUnit}
								/>

								<SwapValueDifference {swapAmount} {receiveAmount} />
							</div>
						{/if}
					{/if}
				</svelte:fragment>

				<svelte:fragment slot="balance">
					{#if nonNullish($destinationToken)}
						<SwapTokenBalance token={$destinationToken} balance={$destinationTokenBalance} />
					{/if}
				</svelte:fragment>
			</SwapSelectToken>
		</div>

		<SwapSlippage bind:slippageValue />

		{#if nonNullish($destinationToken) && nonNullish($sourceToken)}
			<Hr spacing="md" />

			<SwapFees />
		{/if}
	</div>

	<ButtonGroup slot="toolbar">
		<ButtonCancel on:click={() => dispatch('icClose')} />

		<Button disabled={invalid} on:click={() => dispatch('icNext')}>
			{$i18n.swap.text.review_button}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
