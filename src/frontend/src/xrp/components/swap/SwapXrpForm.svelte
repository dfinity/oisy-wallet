<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import SwapForm from '$lib/components/swap/SwapForm.svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { tryParseToken } from '$lib/utils/parse.utils';
	import SwapXrpFees from '$xrp/components/swap/SwapXrpFees.svelte';
	import { XRP_FEE_CONTEXT_KEY, type XrpFeeContext } from '$xrp/stores/xrp-fee.store';
	import { isXrpAmountSendable } from '$xrp/utils/xrp-send.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		isSwapAmountsLoading: boolean;
		onShowTokensList: (tokenSource: 'source' | 'destination') => void;
		onShowProviderList: () => void;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		isSwapAmountsLoading,
		onShowTokensList,
		onShowProviderList,
		onClose,
		onNext
	}: Props = $props();

	const { sourceToken, destinationToken, sourceTokenBalance } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { feeStore, reserveStore }: XrpFeeContext = getContext<XrpFeeContext>(XRP_FEE_CONTEXT_KEY);

	let errorType = $state<TokenActionErrorType | undefined>();

	// `SwapForm` holds Max and Review back while its fee is unknown. The reserve is as much a part of
	// what the account cannot send as the fee, so the fee is handed over only once both are known:
	// an amount judged against a guessed reserve is the one the ledger refuses.
	let fee = $derived(nonNullish($reserveStore) ? $feeStore : undefined);

	// What a payment from this account can carry: the balance less the fee and the reserve.
	let maxAmount = $derived.by(() => {
		if (isNullish(fee) || isNullish($reserveStore) || isNullish($sourceTokenBalance)) {
			return undefined;
		}

		const max = $sourceTokenBalance - fee - $reserveStore;

		return max > ZERO ? max : ZERO;
	});

	const customValidate = (userAmount: bigint): TokenActionErrorType => {
		const balance = $sourceTokenBalance ?? ZERO;

		if (userAmount > balance) {
			return 'insufficient-funds';
		}

		// Skipped while either is unknown, as in `XrpSendAmount`: Review stays disabled until both
		// are known, and the wizard checks again before signing.
		if (
			nonNullish($feeStore) &&
			nonNullish($reserveStore) &&
			!isXrpAmountSendable({
				amount: userAmount,
				balance,
				fee: $feeStore,
				reserve: $reserveStore
			})
		) {
			return 'insufficient-funds-for-fee';
		}

		return undefined;
	};

	$effect(() => {
		// The error has to go when the amount does: `selectToken` drops `swapAmount` on a
		// source-token change, and the user can empty the input. `errorType` is passed to
		// `SwapForm` one-way here, as in `SwapSolForm`, so nothing downstream can clear it.
		if (isNullish($sourceToken) || isNullish(swapAmount)) {
			errorType = undefined;

			return;
		}

		// Not `parseToken`: the amount outlives a source-token change, so it can carry more
		// precision than the token has decimals, and throwing here would abort the effect flush.
		const parsedAmount = tryParseToken({
			value: `${swapAmount}`,
			unitName: $sourceToken.decimals
		});

		// Rerun on a fee, reserve or balance change as well as on the amount, because
		// `customValidate` reads all three: the poller can raise the fee under an accepted amount.
		const newErrorType = isNullish(parsedAmount) ? 'invalid-amount' : customValidate(parsedAmount);

		if (newErrorType !== errorType) {
			errorType = newErrorType;
		}
	});
</script>

<SwapForm
	{errorType}
	{fee}
	{isSwapAmountsLoading}
	{maxAmount}
	{onClose}
	onCustomValidate={customValidate}
	{onNext}
	{onShowTokensList}
	bind:swapAmount
	bind:receiveAmount
	bind:slippageValue
>
	{#snippet message()}
		<!-- The input only turns red, and the reserve is the part of the refusal a user cannot
		     infer from the balance shown. -->
		{#if errorType === 'insufficient-funds-for-fee'}
			<div class="mb-4" in:fade>
				<MessageBox level="error">{$i18n.send.assertion.insufficient_funds_for_reserve}</MessageBox>
			</div>
		{/if}
	{/snippet}

	{#snippet swapDetails()}
		{#if nonNullish($destinationToken) && nonNullish($sourceToken)}
			<Hr spacing="md" />

			<div class="flex flex-col gap-3">
				<SwapProvider {onShowProviderList} showSelectButton {slippageValue} />

				<SwapXrpFees />
			</div>
		{/if}
	{/snippet}
</SwapForm>
