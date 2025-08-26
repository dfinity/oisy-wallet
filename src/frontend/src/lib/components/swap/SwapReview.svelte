<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { isEmptyString, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import SwapImpact from '$lib/components/swap/SwapValueDifference.svelte';
	import TokensReview from '$lib/components/tokens/TokensReview.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import {
		TRACK_OPEN_DOCUMENTATION,
		TRACK_OPEN_EXTERNAL_LINK
	} from '$lib/constants/analytics.contants';
	import { OISY_DOCS_SWAP_WIDTHDRAW_FROM_ICPSWAP_LINK } from '$lib/constants/swap.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import { SwapErrorCodes } from '$lib/types/swap';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount: number | undefined;
		slippageValue: OptionAmount;
		onBack: () => void;
		onClose?: () => void;
		onSwap: () => Promise<void>;
		swapFees: Snippet;
	}
	let {
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		onBack,
		onClose,
		onSwap,
		swapFees
	}: Props = $props();

	const {
		sourceToken,
		destinationToken,
		sourceTokenExchangeRate,
		destinationTokenExchangeRate,
		failedSwapError
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

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

	{#if nonNullish($sourceTokenExchangeRate) && nonNullish($destinationTokenExchangeRate)}
		<ModalValue>
			{#snippet label()}
				{$i18n.swap.text.value_difference}
			{/snippet}

			{#snippet mainValue()}
				<SwapImpact {receiveAmount} {swapAmount} />
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

	{#if nonNullish($destinationToken) && nonNullish($sourceToken) && $sourceToken.network.id !== $destinationToken.network.id}
		<MessageBox styleClass="sm:text-sm">
			<Html
				text={replacePlaceholders($i18n.swap.text.cross_chain_networks_info, {
					$sourceNetwork: $sourceToken.network.name,
					$destinationNetwork: $destinationToken.network.name
				})}
			/>
		</MessageBox>
	{/if}

	{#if nonNullish($failedSwapError)}
		<div class="mt-4">
			<MessageBox level={$failedSwapError.variant}>
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

				<Button onclick={onSwap}>
					{nonNullish($failedSwapError?.errorType) && isEmptyString($failedSwapError?.message)
						? $i18n.transaction.type.withdraw
						: $i18n.swap.text.swap_button}
				</Button>
			{/if}
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
