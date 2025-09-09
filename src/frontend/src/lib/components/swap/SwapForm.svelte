<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import { IC_TOKEN_FEE_CONTEXT_KEY, type IcTokenFeeContext } from '$icp/stores/ic-token-fee.store';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import SwapFees from '$lib/components/swap/SwapFees.svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import SwapSlippage from '$lib/components/swap/SwapSlippage.svelte';
	import SwapSwitchTokensButton from '$lib/components/swap/SwapSwitchTokensButton.svelte';
	import SwapValueDifference from '$lib/components/swap/SwapValueDifference.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import TokenInputBalance from '$lib/components/tokens/TokenInputBalance.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { SWAP_SLIPPAGE_INVALID_VALUE } from '$lib/constants/swap.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { formatTokenBigintToNumber } from '$lib/utils/format.utils';
	import { validateUserAmount } from '$lib/utils/user-amount.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount: number | undefined;
		slippageValue: OptionAmount;
		isSwapAmountsLoading: boolean;
	}

	let {
		swapAmount = $bindable<OptionAmount>(),
		receiveAmount = $bindable<number | undefined>(),
		slippageValue = $bindable<OptionAmount>(),
		isSwapAmountsLoading
	}: Props = $props();

	const {
		sourceToken,
		destinationToken,
		destinationTokenBalance,
		sourceTokenExchangeRate,
		sourceTokenBalance,
		destinationTokenExchangeRate,
		isSourceTokenIcrc2,
		switchTokens
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const { store: icTokenFeeStore } = getContext<IcTokenFeeContext>(IC_TOKEN_FEE_CONTEXT_KEY);

	let errorType: TokenActionErrorType = $state<TokenActionErrorType | undefined>(undefined);
	let amountSetToMax = $state(false);
	let exchangeValueUnit: DisplayUnit = $state<DisplayUnit>('usd');

	let inputUnit: DisplayUnit = $derived(exchangeValueUnit === 'token' ? 'usd' : 'token');

	let sourceTokenFee: bigint | undefined = $derived(
		nonNullish($sourceToken) && nonNullish($icTokenFeeStore)
			? $icTokenFeeStore[$sourceToken.symbol]
			: undefined
	);

	let totalFee: bigint | undefined = $derived(
		(sourceTokenFee ?? ZERO) * ($isSourceTokenIcrc2 ? 2n : 1n)
	);

	let swapAmountsLoading = $derived(
		nonNullish(swapAmount) && nonNullish($swapAmountsStore?.amountForSwap)
			? Number(swapAmount) !== Number($swapAmountsStore.amountForSwap)
			: false
	);

	let showSwapNotOfferedError = $derived(
		nonNullish($swapAmountsStore) &&
			$swapAmountsStore.swaps.length === 0 &&
			!isSwapAmountsLoading &&
			nonNullish(swapAmount) &&
			Number(swapAmount) > 0
	);

	let disableSwitchTokens = $derived(
		(nonNullish(swapAmount) && isNullish(receiveAmount)) || swapAmountsLoading
	);

	let invalid: boolean = $derived(
		nonNullish(errorType) ||
			isNullish(swapAmount) ||
			Number(swapAmount) <= 0 ||
			isNullish(receiveAmount) ||
			isNullish(sourceTokenFee) ||
			swapAmountsLoading ||
			(nonNullish(slippageValue) && Number(slippageValue) >= SWAP_SLIPPAGE_INVALID_VALUE)
	);

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

	const dispatch = createEventDispatcher();

	const onTokensSwitch = () => {
		const tempAmount = receiveAmount;

		swapAmountsStore.reset();
		amountSetToMax = false;
		swapAmount = tempAmount;

		switchTokens();
	};

	const customValidate = (userAmount: bigint): TokenActionErrorType =>
		nonNullish($sourceToken)
			? validateUserAmount({
					userAmount,
					token: $sourceToken,
					balance: $sourceTokenBalance,
					fee: totalFee,
					isSwapFlow: true
				})
			: undefined;
</script>

<ContentWithToolbar>
	<div>
		<div class="relative">
			<div class="mb-2">
				<TokenInput
					{customValidate}
					displayUnit={inputUnit}
					exchangeRate={$sourceTokenExchangeRate}
					token={$sourceToken}
					bind:amount={swapAmount}
					bind:errorType
					bind:amountSetToMax
					on:click={() => {
						dispatch('icShowTokensList', 'source');
					}}
				>
					{#snippet title()}
						<span>{$i18n.tokens.text.source_token_title}</span>
					{/snippet}

					<!-- @migration-task: migrate this slot by hand, `amount-info` is an invalid identifier -->
					<!-- @migration-task: migrate this slot by hand, `amount-info` is an invalid identifier -->
					<!-- @migration-task: migrate this slot by hand, `amount-info` is an invalid identifier -->
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

					{#snippet balance()}
						{#if nonNullish($sourceToken)}
							{#if nonNullish(sourceTokenFee)}
								<MaxBalanceButton
									balance={$sourceTokenBalance}
									error={nonNullish(errorType)}
									fee={totalFee}
									token={$sourceToken}
									bind:amountSetToMax
									bind:amount={swapAmount}
								/>
							{:else}
								<div class="w-14 sm:w-16">
									<SkeletonText />
								</div>
							{/if}
						{/if}
					{/snippet}
				</TokenInput>
			</div>

			<SwapSwitchTokensButton disabled={disableSwitchTokens} on:icSwitchTokens={onTokensSwitch} />

			<TokenInput
				amount={receiveAmount}
				disabled={true}
				displayUnit={inputUnit}
				exchangeRate={$destinationTokenExchangeRate}
				loading={swapAmountsLoading}
				token={$destinationToken}
				on:click={() => {
					dispatch('icShowTokensList', 'destination');
				}}
			>
				{#snippet title()}
					<span>{$i18n.tokens.text.destination_token_title}</span>
				{/snippet}

				<!-- @migration-task: migrate this slot by hand, `amount-info` is an invalid identifier -->
				<!-- @migration-task: migrate this slot by hand, `amount-info` is an invalid identifier -->
				<!-- @migration-task: migrate this slot by hand, `amount-info` is an invalid identifier -->
				<svelte:fragment slot="amount-info">
					{#if nonNullish($destinationToken)}
						{#if showSwapNotOfferedError}
							<div class="text-error-primary" transition:slide={SLIDE_DURATION}
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

								{#if swapAmountsLoading}
									<span class="mt-0.5 w-10">
										<SkeletonText />
									</span>
								{:else}
									<SwapValueDifference {receiveAmount} {swapAmount} />
								{/if}
							</div>
						{/if}
					{/if}
				</svelte:fragment>

				{#snippet balance()}
					{#if nonNullish($destinationToken)}
						<TokenInputBalance balance={$destinationTokenBalance} token={$destinationToken} />
					{/if}
				{/snippet}
			</TokenInput>
		</div>

		<SwapSlippage maxSlippageInvalidValue={SWAP_SLIPPAGE_INVALID_VALUE} bind:slippageValue />

		{#if nonNullish($destinationToken) && nonNullish($sourceToken)}
			<Hr spacing="md" />

			<div class="flex flex-col gap-3">
				<SwapProvider showSelectButton {slippageValue} on:icShowProviderList />
				<SwapFees />
			</div>
		{/if}
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={() => dispatch('icClose')} />

			<Button disabled={invalid} onclick={() => dispatch('icNext')}>
				{$i18n.swap.text.review_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
