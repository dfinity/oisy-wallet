<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import SwapSwitchTokensButton from '$lib/components/swap/SwapSwitchTokensButton.svelte';
	import SwapValueDifference from '$lib/components/swap/SwapValueDifference.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import TokenInputBalance from '$lib/components/tokens/TokenInputBalance.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { SWAP_SLIPPAGE_INVALID_VALUE } from '$lib/constants/swap.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { InsufficientFundsError, type OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { formatToken, formatTokenBigintToNumber } from '$lib/utils/format.utils';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { balancesStore } from '$lib/stores/balances.store';
	import type { Token } from '$lib/types/token';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount: number | undefined;
		slippageValue: OptionAmount;
		insufficientFunds: boolean;
		nativeEthereumToken: Token;
	}

	let {
		swapAmount = $bindable<OptionAmount>(),
		receiveAmount = $bindable<number | undefined>(),
		slippageValue = $bindable<OptionAmount>(),
		insufficientFunds = $bindable<boolean>(),
		nativeEthereumToken
	}: Props = $props();

	const {
		sourceToken,
		destinationToken,
		sourceTokenId,
		destinationTokenBalance,
		sourceTokenExchangeRate,
		sourceTokenBalance,
		destinationTokenExchangeRate,
		switchTokens
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let errorType: TokenActionErrorType = $state<TokenActionErrorType | undefined>(undefined);
	let amountSetToMax = $state(false);
	let exchangeValueUnit: DisplayUnit = $state<DisplayUnit>('usd');
	let inputUnit: DisplayUnit = $derived(exchangeValueUnit === 'token' ? 'usd' : 'token');
	let insufficientFundsError: InsufficientFundsError | undefined = $state(undefined);

	const {
		feeStore: storeFeeData,
		minGasFee,
		maxGasFee
	} = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	/**
	 * Reevaluate max amount if user has used the "Max" button and the fees are changing.
	 */

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
		insufficientFunds = nonNullish(insufficientFundsError);
	});

	const dispatch = createEventDispatcher();


	const customValidate = (userAmount: bigint): Error | undefined => {
		if (isNullish($storeFeeData) || isNullish($sourceTokenId) || isNullish(swapAmount)) {
			return;
		}

		// We should align the $sendBalance and userAmount to avoid issues caused by comparing formatted and unformatted BN
		const parsedSendBalance = nonNullish($sourceToken)
			? parseToken({
					value: formatToken({
						value: BigInt(swapAmount),
						unitName: $sourceToken.decimals,
						displayDecimals: $sourceToken.decimals
					}),
					unitName: $sourceToken.decimals
				})
			: ZERO;

		// If ETH, the balance should cover the user entered amount plus the min gas fee
		if (isSupportedEthTokenId($sourceTokenId) || isSupportedEvmNativeTokenId($sourceTokenId)) {
			const total = userAmount + ($minGasFee ?? ZERO);

			if (total > parsedSendBalance) {
				return new InsufficientFundsError($i18n.send.assertion.insufficient_funds_for_gas);
			}

			return;
		}

		// If ERC20, the balance of the token - e.g. 20 DAI - should cover the amount entered by the user
		if (userAmount > parsedSendBalance) {
			return new InsufficientFundsError($i18n.send.assertion.insufficient_funds_for_amount);
		}

		// Finally, if ERC20, the ETH balance should be less or greater than the max gas fee
		const ethBalance = $balancesStore?.[nativeEthereumToken.id]?.data ?? ZERO;
		if (nonNullish($maxGasFee) && ethBalance < $maxGasFee) {
			return new InsufficientFundsError(
				$i18n.send.assertion.insufficient_ethereum_funds_to_cover_the_fees
			);
		}
	};
</script>

<div class="relative">
	<div class="mb-2">
		<TokenInput
			bind:amount={swapAmount}
			displayUnit={inputUnit}
			exchangeRate={$sourceTokenExchangeRate}
			bind:amountSetToMax
			token={$sourceToken}
			customErrorValidate={customValidate}
			on:click={() => {
				dispatch('icShowTokensList', 'source');
			}}
			bind:error={insufficientFundsError}
			autofocus={nonNullish($sourceToken)}
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
						error={nonNullish(insufficientFundsError)}
						balance={$sourceTokenBalance}
						token={$sourceToken}
						fee={$maxGasFee}
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
