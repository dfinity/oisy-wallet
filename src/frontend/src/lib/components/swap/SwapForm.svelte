<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import { readable } from 'svelte/store';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import SwapCrossChainInfo from '$lib/components/swap/SwapCrossChainInfo.svelte';
	import SwapSwitchTokensButton from '$lib/components/swap/SwapSwitchTokensButton.svelte';
	import SwapTwoSwapsHint from '$lib/components/swap/SwapTwoSwapsHint.svelte';
	import SwapValueDifference from '$lib/components/swap/SwapValueDifference.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import TokenInputBalance from '$lib/components/tokens/TokenInputBalance.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { SUPPORTED_CROSS_SWAP_NETWORKS } from '$lib/constants/swap.constants';
	import { SWAP_DESTINATION_TOKEN_BALANCE } from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { swapSupportedTokensStore } from '$lib/stores/swap-supported-tokens.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { formatToken, formatTokenBigintToNumber } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { filterSwapTokens } from '$lib/utils/swap-tokens-filter.utils';
	import {
		canPayWithToken,
		getSwapSlippageInvalidValue,
		getSwapSlippageStatus
	} from '$lib/utils/swap.utils';
	import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
	import { slide } from '$lib/utils/transitions.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		isSwapAmountsLoading: boolean;
		swapDetails?: Snippet;
		message?: Snippet;
		errorType?: TokenActionErrorType;
		/**
		 * Holds Review for a problem the form reports itself, away from the pay field — an EVM
		 * swap whose network coin cannot cover the gas. Unlike `errorType`, it leaves the pay field
		 * undecorated: no amount typed there fixes it.
		 */
		disabled?: boolean;
		/**
		 * Set by a form that already accounts for the absence of an offer itself — because the
		 * inputs a quote needs are still loading, or because it is showing the specific reason
		 * the amount cannot be quoted. Suppresses the generic "swap is not offered", which in
		 * those cases contradicts the message beside it: a swap *is* offered, just not for this
		 * amount or not yet.
		 */
		notOfferedExplained?: boolean;
		onCustomValidate: (userAmount: bigint) => TokenActionErrorType;
		fee?: bigint;
		/**
		 * Hard cap (base units) for "Max", for a source token whose spendable amount is lower
		 * than its balance — BTC, where the balance also counts UTXOs a send cannot select yet.
		 * Left unset, "Max" is the balance minus the fee as before.
		 */
		maxAmount?: bigint;
		// Called when the user presses "Max", before it is applied.
		onMax?: () => void;
		onShowTokensList: (tokenSource: 'source' | 'destination') => void;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue,
		isSwapAmountsLoading,
		swapDetails,
		message,
		errorType = $bindable(),
		disabled = false,
		notOfferedExplained = false,
		onCustomValidate,
		fee,
		maxAmount,
		onMax,
		onShowTokensList,
		onClose,
		onNext
	}: Props = $props();

	const {
		sourceToken,
		destinationToken,
		destinationTokenBalance,
		sourceTokenExchangeRate,
		sourceTokenBalance,
		destinationTokenExchangeRate,
		amountSetToMax,
		switchTokens
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore, activity } =
		getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);
	const quoteActivity = activity ?? readable(undefined);
	const foregroundQuotePending = $derived(
		$quoteActivity?.pending === true && !$quoteActivity.background
	);

	// Nothing loads the balance of an inactive token, except Swap for ICRC tokens: showing 0 would be
	// wrong for a token the user may hold.
	let destinationBalanceUnknown = $derived(
		nonNullish($destinationToken) &&
			isTokenToggleable($destinationToken) &&
			!$destinationToken.enabled &&
			isNullish($destinationTokenBalance)
	);

	let exchangeValueUnit = $state<DisplayUnit>('usd');
	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');

	let swapAmountsLoading = $derived(
		foregroundQuotePending ||
			(nonNullish(swapAmount) && nonNullish($swapAmountsStore?.amountForSwap)
				? Number(swapAmount) !== Number($swapAmountsStore.amountForSwap)
				: false)
	);

	let showSwapNotOfferedError = $derived(
		nonNullish($swapAmountsStore) &&
			$swapAmountsStore.swaps.length === 0 &&
			!isSwapAmountsLoading &&
			!notOfferedExplained &&
			nonNullish(swapAmount) &&
			Number(swapAmount) > 0
	);

	// A provider that refused the amount as below its minimum names the reason no offer
	// exists, so the specific message replaces the generic "swap is not offered".
	let quoteError = $derived(
		nonNullish($swapAmountsStore) && $swapAmountsStore.swaps.length === 0
			? $swapAmountsStore.quoteError
			: undefined
	);

	// No offer, but two separate swaps through a token OISY lists reach the destination. Unlike the
	// "not offered" line, the hint stays up while the offers refresh, and goes with a new amount.
	let twoSwapsQuoteError = $derived(
		quoteError?.type === 'two-swaps' &&
			!swapAmountsLoading &&
			!notOfferedExplained &&
			nonNullish(swapAmount) &&
			Number(swapAmount) > 0
			? quoteError
			: undefined
	);

	let quoteErrorMinAmount = $derived(
		quoteError?.type === 'amount-too-low' &&
			nonNullish(quoteError.minAmount) &&
			nonNullish($sourceToken)
			? formatToken({
					value: quoteError.minAmount,
					unitName: $sourceToken.decimals,
					displayDecimals: $sourceToken.decimals
				})
			: undefined
	);

	// A switch makes the receive token the pay token, so it follows the pay list: only a token that
	// list offers and lets you pick can become the pay token.
	let destinationTokenPayable = $derived(
		nonNullish($destinationToken) &&
			canPayWithToken({ ...$destinationToken, balance: $destinationTokenBalance }) &&
			filterSwapTokens({
				tokens: [{ ...$destinationToken, enabled: true }],
				supportedData: $swapSupportedTokensStore?.aggregated
			}).length > 0
	);

	let isSwitchTokensButtonDisabled = $derived(() => {
		// A pay token alone can always move: with no pay token, the receive list offers every token.
		if (isNullish($destinationToken)) {
			return isNullish($sourceToken);
		}

		if (!destinationTokenPayable) {
			return true;
		}

		// A receive token alone has no quote or network pair to wait for.
		if (isNullish($sourceToken)) {
			return false;
		}

		const condition1 = (nonNullish(swapAmount) && isNullish(receiveAmount)) || swapAmountsLoading;
		const condition2 = !SUPPORTED_CROSS_SWAP_NETWORKS[$destinationToken.network.id]?.includes(
			$sourceToken.network.id
		);
		return condition1 || condition2;
	});

	let maxSlippageInvalidValue = $derived(getSwapSlippageInvalidValue($sourceToken?.network.id));

	// The slippage is edited from the modal header, so the form names the reason it blocks Review.
	let slippageInvalid = $derived(
		getSwapSlippageStatus({ slippageValue, maxSlippageInvalidValue }) === 'invalid'
	);

	let invalid = $derived(
		disabled ||
			nonNullish(errorType) ||
			isNullish(swapAmount) ||
			Number(swapAmount) <= 0 ||
			isNullish(receiveAmount) ||
			isNullish(fee) ||
			swapAmountsLoading ||
			foregroundQuotePending ||
			slippageInvalid
	);

	$effect(() => {
		receiveAmount =
			nonNullish($destinationToken) &&
			nonNullish($swapAmountsStore?.selectedProvider?.receiveAmount)
				? formatTokenBigintToNumber({
						value: $swapAmountsStore.selectedProvider.receiveAmount,
						unitName: $destinationToken.decimals,
						displayDecimals: $destinationToken.decimals
					})
				: undefined;
	});

	const onTokensSwitch = () => {
		const tempAmount = receiveAmount;
		const newSourceDecimals = $destinationToken?.decimals;

		swapAmountsStore.reset();

		swapAmount =
			nonNullish(tempAmount) && nonNullish(newSourceDecimals)
				? formatTokenBigintToNumber({
						value: parseToken({ value: `${tempAmount}`, unitName: newSourceDecimals }),
						unitName: newSourceDecimals,
						displayDecimals: newSourceDecimals
					})
				: tempAmount;

		switchTokens();
	};
</script>

<ContentWithToolbar>
	<div>
		<div class="relative">
			<div class="mb-2">
				<TokenInput
					displayUnit={inputUnit}
					exchangeRate={$sourceTokenExchangeRate}
					onClick={() => onShowTokensList('source')}
					{onCustomValidate}
					showTokenNetwork
					token={$sourceToken}
					bind:amount={swapAmount}
					bind:errorType
					bind:amountSetToMax={$amountSetToMax}
				>
					{#snippet title()}{$i18n.tokens.text.source_token_title}{/snippet}

					{#snippet amountInfo()}
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
					{/snippet}

					{#snippet balance()}
						{#if nonNullish($sourceToken)}
							{#if nonNullish(fee)}
								<MaxBalanceButton
									balance={$sourceTokenBalance}
									error={nonNullish(errorType)}
									{fee}
									{maxAmount}
									{onMax}
									token={$sourceToken}
									bind:amountSetToMax={$amountSetToMax}
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

			<SwapSwitchTokensButton disabled={isSwitchTokensButtonDisabled()} {onTokensSwitch} />

			<div class="mb-2">
				<TokenInput
					amount={swapAmountsLoading ? 0 : receiveAmount}
					disabled={true}
					displayUnit={inputUnit}
					exchangeRate={$destinationTokenExchangeRate}
					loading={swapAmountsLoading}
					onClick={() => onShowTokensList('destination')}
					showTokenNetwork
					token={$destinationToken}
				>
					{#snippet title()}{$i18n.tokens.text.destination_token_title}{/snippet}

					{#snippet amountInfo()}
						{#if nonNullish($destinationToken)}
							{#if showSwapNotOfferedError}
								<div class="text-error-primary" transition:slide={SLIDE_DURATION}
									>{#if quoteError?.type === 'amount-too-low'}
										{#if nonNullish(quoteErrorMinAmount) && nonNullish($sourceToken)}
											{replacePlaceholders($i18n.swap.text.swap_amount_too_low_minimum, {
												$amount: quoteErrorMinAmount,
												$symbol: $sourceToken.symbol
											})}
										{:else}
											{$i18n.swap.text.swap_amount_too_low}
										{/if}
									{:else}
										{$i18n.swap.text.swap_is_not_offered}
									{/if}</div
								>
							{:else}
								<div class="flex gap-3 text-tertiary">
									<TokenInputAmountExchange
										amount={swapAmountsLoading ? 0 : receiveAmount}
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
					{/snippet}

					{#snippet balance()}
						{#if nonNullish($destinationToken) && !destinationBalanceUnknown}
							<TokenInputBalance
								balance={$destinationTokenBalance}
								testId={SWAP_DESTINATION_TOKEN_BALANCE}
								token={$destinationToken}
							/>
						{/if}
					{/snippet}
				</TokenInput>
			</div>
		</div>

		<!-- mt-4 like the notices below; when empty, its margin collapses into the next row's. -->
		<div class="mt-4">
			{@render message?.()}
		</div>

		{#if nonNullish(twoSwapsQuoteError)}
			{#key twoSwapsQuoteError.intermediateToken.id}
				<SwapTwoSwapsHint
					intermediateToken={twoSwapsQuoteError.intermediateToken}
					provider={twoSwapsQuoteError.provider}
				/>
			{/key}
		{:else}
			<SwapCrossChainInfo />
		{/if}

		{#if slippageInvalid}
			<p class="mt-4 text-sm text-error-primary" transition:slide={SLIDE_DURATION}>
				{replacePlaceholders($i18n.swap.text.max_slippage_error, {
					$maxSlippage: maxSlippageInvalidValue.toString()
				})}
			</p>
		{/if}

		{@render swapDetails?.()}
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={onClose} />

			<Button disabled={invalid} onclick={onNext}>
				{$i18n.swap.text.review_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
