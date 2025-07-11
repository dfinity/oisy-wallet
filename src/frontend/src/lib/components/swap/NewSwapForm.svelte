<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';

	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import TokenInputBalance from '$lib/components/tokens/TokenInputBalance.svelte';
	import SwapSwitchTokensButton from '$lib/components/swap/SwapSwitchTokensButton.svelte';
	import SwapValueDifference from '$lib/components/swap/SwapValueDifference.svelte';

	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { formatTokenBigintToNumber } from '$lib/utils/format.utils';
	import MaxBalanceButton from '../common/MaxBalanceButton.svelte';
	import SwapSlippage from './SwapSlippage.svelte';
	import TokenInputWrapper from '../tokens/TokenInputWrapper.svelte';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount: number | undefined;
		slippageValue: OptionAmount;
		errorType?: TokenActionErrorType;
		customValidate?: (userAmount: bigint) => TokenActionErrorType;
		customErrorValidate?: (userAmount: bigint) => Error | undefined;
		fee?: bigint;
		swapAmountsLoading?: boolean;
		error?: Error | undefined;
	}

	let {
		swapAmount = $bindable<OptionAmount>(),
		receiveAmount = $bindable<number | undefined>(),
		slippageValue = $bindable<OptionAmount>(),
		errorType = $bindable<TokenActionErrorType | undefined>(),
		customValidate = $bindable<(userAmount: bigint) => TokenActionErrorType>(),
		customErrorValidate = $bindable<(userAmount: bigint) => Error | undefined>(),
		fee,
		swapAmountsLoading = false,
		error = $bindable<Error | undefined>()
	}: Props = $props();

	const {
		sourceToken,
		destinationToken,
		sourceTokenBalance,
		destinationTokenBalance,
		sourceTokenExchangeRate,
		destinationTokenExchangeRate,
		switchTokens
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	let amountSetToMax = $state(false);
	let exchangeValueUnit: DisplayUnit = $state<DisplayUnit>('usd');
	let inputUnit: DisplayUnit = $derived(exchangeValueUnit === 'token' ? 'usd' : 'token');

	let disableSwitchTokens = $derived(
		(nonNullish(swapAmount) && isNullish(receiveAmount)) || swapAmountsLoading
	);

	const onTokensSwitch = () => {
		const tempAmount = receiveAmount;
		swapAmountsStore.reset();
		amountSetToMax = false;
		swapAmount = tempAmount;
		switchTokens();
	};
	
	$effect(() => {
		if (
			nonNullish($destinationToken) &&
			nonNullish($swapAmountsStore?.selectedProvider?.receiveAmount)
		) {
			receiveAmount = formatTokenBigintToNumber({
				value: $swapAmountsStore?.selectedProvider?.receiveAmount,
				unitName: $destinationToken.decimals,
				displayDecimals: $destinationToken.decimals
			});
		} else {
			receiveAmount = undefined;
		}
	});

</script>

<div class="relative">
	<TokenInputWrapper tokenNetworkId={$sourceToken?.network?.id}>
		{#snippet tokenInput()}
			<TokenInput
				bind:amount={swapAmount}
				bind:amountSetToMax
				bind:errorType
				bind:error
				{customValidate}
				{customErrorValidate}
				token={$sourceToken}
				showErrorMessage={false}
				autofocus={nonNullish($sourceToken)}
				displayUnit={inputUnit}
				exchangeRate={$sourceTokenExchangeRate}
				supportCrossChain={true}
				tokenNetwork={$sourceToken?.network}
				on:click={() => {
					dispatch('icShowTokensList', 'source');
				}}
			>
				<span slot="title">{$i18n.tokens.text.source_token_title}</span>

				<svelte:fragment slot="amount-info">
					{#if nonNullish($sourceToken)}
						<div class="text-tertiary">
							<TokenInputAmountExchange
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
						<MaxBalanceButton
							bind:amountSetToMax
							bind:amount={swapAmount}
							error={nonNullish(errorType) || nonNullish(error)}
							balance={$sourceTokenBalance}
							token={$sourceToken}
							{fee}
						/>
					{/if}
				</svelte:fragment>
			</TokenInput>
		{/snippet}
	</TokenInputWrapper>

	<SwapSwitchTokensButton disabled={disableSwitchTokens} on:icSwitchTokens={onTokensSwitch} />
	<TokenInputWrapper tokenNetworkId={$destinationToken?.network?.id}>
		{#snippet tokenInput()}
			<TokenInput
				token={$destinationToken}
				amount={receiveAmount}
				displayUnit={inputUnit}
				exchangeRate={$destinationTokenExchangeRate}
				loading={swapAmountsLoading}
				disabled={true}
				supportCrossChain={true}
				tokenNetwork={$destinationToken?.network}
				on:click={() => {
					dispatch('icShowTokensList', 'destination');
				}}
			>
				<span slot="title">{$i18n.tokens.text.destination_token_title}</span>

				<svelte:fragment slot="amount-info">
					{#if nonNullish($destinationToken)}
						{#if $swapAmountsStore?.swaps.length === 0}
							<div transition:slide={SLIDE_DURATION} class="text-error-primary"
								>{$i18n.swap.text.swap_is_not_offered}</div
							>
						{:else}
							<div class="flex gap-3 text-tertiary">
								<TokenInputAmountExchange
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
						<TokenInputBalance token={$destinationToken} balance={$destinationTokenBalance} />
					{/if}
				</svelte:fragment>
			</TokenInput>
		{/snippet}
	</TokenInputWrapper>
</div>

<SwapSlippage bind:slippageValue />
