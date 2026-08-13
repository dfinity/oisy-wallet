<script lang="ts">
	import { isEmptyString, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet, untrack } from 'svelte';
	import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
	import SwapCrossChainInfo from '$lib/components/swap/SwapCrossChainInfo.svelte';
	import SwapNearIntentsTos from '$lib/components/swap/SwapNearIntentsTos.svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import SwapValueDifference from '$lib/components/swap/SwapValueDifference.svelte';
	import TokensReview from '$lib/components/tokens/TokensReview.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import {
		TRACK_OPEN_DOCUMENTATION,
		TRACK_OPEN_EXTERNAL_LINK
	} from '$lib/constants/analytics.constants';
	import {
		OISY_DOCS_SWAP_WIDTHDRAW_FROM_ICPSWAP_LINK,
		SWAP_VALUE_DIFFERENCE_ERROR_VALUE
	} from '$lib/constants/swap.constants';
	import { hasAcknowledgedNearIntentsSwap } from '$lib/derived/user-provider-agreements.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import { SwapErrorCodes, SwapProvider as SwapProviderEnum } from '$lib/types/swap';
	import { calculateValueDifference } from '$lib/utils/swap.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		onBack: () => void;
		onClose?: () => void;
		onSwap: () => Promise<void>;
		swapFees: Snippet;
		isSwapAmountsLoading?: boolean;
	}

	let {
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		onBack,
		onClose,
		onSwap,
		swapFees,
		isSwapAmountsLoading = false
	}: Props = $props();

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const {
		sourceToken,
		destinationToken,
		sourceTokenExchangeRate,
		destinationTokenExchangeRate,
		failedSwapError
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	let isNearIntentsProvider = $derived(
		NEAR_INTENTS_SWAP_ENABLED &&
			$swapAmountsStore?.selectedProvider?.provider === SwapProviderEnum.NEAR_INTENTS
	);

	const handleBack = () => {
		failedSwapError.set(undefined);
		onBack();
	};

	const handleClose = () => {
		failedSwapError.set(undefined);
		onClose?.();
	};

	let isManualWithdrawSuccess = $derived(
		$failedSwapError?.errorType === SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS &&
			$failedSwapError?.message === $i18n.swap.error.swap_sucess_manually_withdraw_success
	);

	let valueDifference = $derived(
		calculateValueDifference({
			swapAmount,
			receiveAmount,
			sourceTokenExchangeRate: $sourceTokenExchangeRate,
			destinationTokenExchangeRate: $destinationTokenExchangeRate
		})
	);

	let isValueDifferenceError = $derived(
		nonNullish(valueDifference) && valueDifference <= SWAP_VALUE_DIFFERENCE_ERROR_VALUE
	);

	let isMissingTokenPrice = $derived(
		isNullish($sourceTokenExchangeRate) || isNullish($destinationTokenExchangeRate)
	);

	let isWarningConfirmationRequired = $derived(isValueDifferenceError || isMissingTokenPrice);

	let isWarningConfirmed = $state(false);

	const reset = () => {
		isWarningConfirmed = false;
	};

	$effect(() => {
		[valueDifference, isValueDifferenceError, isMissingTokenPrice];

		untrack(reset);
	});

	let swapButtonDisabled = $derived(
		isSwapAmountsLoading || (isWarningConfirmationRequired && !isWarningConfirmed)
	);
</script>

<ContentWithToolbar>
	<TokensReview
		destinationToken={$destinationToken}
		destinationTokenExchangeRate={$destinationTokenExchangeRate}
		{receiveAmount}
		sendAmount={swapAmount}
		sourceToken={$sourceToken}
		sourceTokenExchangeRate={$sourceTokenExchangeRate}
	/>

	<SwapCrossChainInfo />

	{#if nonNullish($sourceTokenExchangeRate) && nonNullish($destinationTokenExchangeRate)}
		<ModalValue>
			{#snippet label()}
				{$i18n.swap.text.value_difference}
			{/snippet}

			{#snippet mainValue()}
				<SwapValueDifference iconPosition="left" {receiveAmount} {swapAmount} />
			{/snippet}
		</ModalValue>
	{/if}

	<ModalValue>
		{#snippet label()}
			{$i18n.swap.text.max_slippage}
		{/snippet}

		{#snippet mainValue()}
			{slippageValue}%
		{/snippet}
	</ModalValue>

	<div class="flex flex-col gap-3">
		<SwapProvider {slippageValue} />
		{@render swapFees()}
	</div>

	{#if isNearIntentsProvider && !$hasAcknowledgedNearIntentsSwap}
		<div class="mt-4">
			<SwapNearIntentsTos />
		</div>
	{/if}

	{#if isWarningConfirmationRequired}
		<div class="mt-4">
			<MessageBox level="error" styleClass="!mb-0">
				{#snippet icon()}
					<Checkbox
						checked={isWarningConfirmed}
						inputId="swap-review-warning-confirmation"
						onChange={() => (isWarningConfirmed = !isWarningConfirmed)}
					/>
				{/snippet}

				<label class="block text-sm leading-snug" for="swap-review-warning-confirmation">
					<Html
						text={isValueDifferenceError
							? $i18n.swap.text.value_difference_error_confirmation
							: $i18n.swap.text.value_difference_missing_price_confirmation}
					/>
				</label>
			</MessageBox>
		</div>
	{/if}

	{#if nonNullish($failedSwapError)}
		<div class="mt-4">
			<MessageBox level={$failedSwapError.variant} styleClass="!mb-0">
				{#if nonNullish($failedSwapError.errorType) && nonNullish($failedSwapError.url) && isEmptyString($failedSwapError?.message)}
					<Html
						text={$failedSwapError.errorType === SwapErrorCodes.SWAP_FAILED_WITHDRAW_FAILED
							? $i18n.swap.error.withdraw_failed_first_part
							: $failedSwapError.errorType === SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED
								? $i18n.swap.error.manually_withdraw_failed
								: $i18n.swap.error.swap_sucess_withdraw_failed}
					/>
					<ExternalLink
						ariaLabel={$i18n.swap.text.open_instructions_link}
						href={OISY_DOCS_SWAP_WIDTHDRAW_FROM_ICPSWAP_LINK}
						iconSize="15"
						trackEvent={{
							name: TRACK_OPEN_DOCUMENTATION,
							metadata: {
								link: OISY_DOCS_SWAP_WIDTHDRAW_FROM_ICPSWAP_LINK
							}
						}}
						>{$i18n.swap.error.swap_failed_instruction_link}
					</ExternalLink>
					{$i18n.swap.error.withdraw_failed_second_part}

					<ExternalLink
						ariaLabel={$i18n.swap.text.open_icp_swap}
						href={$failedSwapError.url.url}
						iconSize="15"
						trackEvent={{
							name: TRACK_OPEN_EXTERNAL_LINK,
							metadata: {
								link: $failedSwapError.url.url
							}
						}}>{$failedSwapError.url.text}</ExternalLink
					>
				{:else}
					{$failedSwapError.message}
				{/if}
			</MessageBox>
		</div>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			{#if isManualWithdrawSuccess}
				<Button onclick={handleClose}>{$i18n.core.text.close}</Button>
			{:else}
				<ButtonBack onclick={handleBack} />

				<Button disabled={swapButtonDisabled} onclick={onSwap}>
					{nonNullish($failedSwapError?.errorType) && isEmptyString($failedSwapError?.message)
						? $i18n.transaction.type.withdraw
						: $i18n.swap.text.swap_button}
				</Button>
			{/if}
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
