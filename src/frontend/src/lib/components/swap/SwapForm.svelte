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
	}

	let {
		swapAmount = $bindable<OptionAmount>(),
		receiveAmount = $bindable<number | undefined>(),
		slippageValue = $bindable<OptionAmount>()
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
								error={nonNullish(errorType)}
								balance={$sourceTokenBalance}
								token={$sourceToken}
								fee={totalFee}
							/>
						{/if}
					</svelte:fragment>
				</TokenInput>
			</div>

			<SwapSwitchTokensButton disabled={disableSwitchTokens} on:icSwitchTokens={onTokensSwitch} />

			<TokenInput
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
		</div>

		<SwapSlippage bind:slippageValue />

		{#if nonNullish($destinationToken) && nonNullish($sourceToken)}
			<Hr spacing="md" />

			<div class="flex flex-col gap-3">
				<SwapProvider on:icShowProviderList showSelectButton {slippageValue} />
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
