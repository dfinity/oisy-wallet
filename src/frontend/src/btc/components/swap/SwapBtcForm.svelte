<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import BtcSendWarnings from '$btc/components/send/BtcSendWarnings.svelte';
	import SwapBtcFees from '$btc/components/swap/SwapBtcFees.svelte';
	import { BTC_MINIMUM_AMOUNT } from '$btc/constants/btc.constants';
	import {
		BtcPendingSentTransactionsStatus,
		initPendingSentTransactionsStatus
	} from '$btc/derived/btc-pending-sent-transactions-status.derived';
	import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeContext } from '$btc/stores/utxos-fee.store';
	import { convertSatoshisToBtc, isInvalidUtxosFee } from '$btc/utils/btc-send.utils';
	import { invalidSendAmount } from '$btc/utils/input.utils';
	import { BTC_EXTENSION_FEATURE_FLAG_ENABLED } from '$env/btc.env';
	import SwapForm from '$lib/components/swap/SwapForm.svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { parseToken, tryParseToken } from '$lib/utils/parse.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		source: string;
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
		source,
		isSwapAmountsLoading,
		onShowTokensList,
		onShowProviderList,
		onClose,
		onNext
	}: Props = $props();

	const { sourceToken, destinationToken, sourceTokenBalance } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: utxosFeeStore } = getContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY);

	let errorType = $state<TokenActionErrorType | undefined>();

	let utxosFee = $derived($utxosFeeStore?.utxosFee);

	// The Bitcoin network fee, which is what `MaxBalanceButton` has to hold back and what
	// the amount is validated against. It is available before any offer exists — the
	// loader prices a default amount on mount — so Review is never blocked on a quote just
	// to learn the fee.
	let networkFee = $derived(utxosFee?.feeSatoshis);

	// The quote refuses to price a selection the send would reject, and it has nothing to price
	// at all until the loaders have filled the three stores it reads. Both surface as "no
	// offer", which is not what either means — a swap is offered, just not for this amount or
	// not yet — so the generic message is left off and the specific one below stands alone.
	let notOfferedExplained = $derived(
		isNullish(utxosFee) || isInvalidUtxosFee(utxosFee) || nonNullish(errorType)
	);

	let hasPendingTransactionsStore = $derived(initPendingSentTransactionsStatus(source));

	// With the BTC extension enabled parallel sends are allowed, so neither the button nor
	// the "wait for the previous send" warning applies. Same split as `BtcConvertForm`.
	let pendingTransactionsStatus = $derived(
		BTC_EXTENSION_FEATURE_FLAG_ENABLED
			? BtcPendingSentTransactionsStatus.NONE
			: $hasPendingTransactionsStore
	);

	const customValidate = (userAmount: bigint): TokenActionErrorType => {
		if (isNullish($sourceToken)) {
			return undefined;
		}

		// The same floor `BtcSendAmount` applies to a plain send, and for the same reason: a
		// smaller output is dust the network will not relay. It also subsumes the amounts the
		// minter's KYT fee would eat entirely, which would otherwise quote a zero receive
		// against a perfectly enabled Review button.
		if (invalidSendAmount(Number(userAmount))) {
			return 'minimum-amount-not-reached';
		}

		// Aligned through the token's own precision, so a formatted balance and a parsed
		// amount are compared in the same space.
		const parsedBalance = nonNullish($sourceTokenBalance)
			? parseToken({
					value: formatToken({
						value: $sourceTokenBalance,
						unitName: $sourceToken.decimals,
						displayDecimals: $sourceToken.decimals
					}),
					unitName: $sourceToken.decimals
				})
			: ZERO;

		if (userAmount > parsedBalance) {
			return 'insufficient-funds';
		}

		// The network fee is paid out of the same UTXOs as the deposit, so the balance has
		// to cover both.
		if (nonNullish(networkFee) && userAmount + networkFee > parsedBalance) {
			return 'insufficient-funds-for-fee';
		}

		return undefined;
	};

	$effect(() => {
		// The error has to go when the amount does: `selectToken` drops `swapAmount` on a
		// source-token change, and the user can empty the input. `errorType` is passed to
		// `SwapForm` one-way here — unlike `SwapIcpForm`, which binds it — so nothing downstream
		// can clear it, and a stale error would hold the form invalid against a blank amount.
		if (isNullish($sourceToken) || isNullish(swapAmount)) {
			errorType = undefined;

			return;
		}

		// Not `parseToken`: the amount outlives a source-token change, so it can carry more
		// precision than the new token has decimals. Throwing here would abort the effect
		// flush mid-update and leave the modal unresponsive, so an amount the token cannot
		// represent is surfaced as a validation error instead.
		const parsedAmount = tryParseToken({
			value: `${swapAmount}`,
			unitName: $sourceToken.decimals
		});

		const newErrorType = isNullish(parsedAmount) ? 'invalid-amount' : customValidate(parsedAmount);

		if (newErrorType !== errorType) {
			errorType = newErrorType;
		}
	});
</script>

<SwapForm
	{errorType}
	fee={networkFee}
	{isSwapAmountsLoading}
	{notOfferedExplained}
	{onClose}
	onCustomValidate={customValidate}
	{onNext}
	{onShowTokensList}
	bind:swapAmount
	bind:receiveAmount
	bind:slippageValue
>
	{#snippet message()}
		{#if errorType === 'minimum-amount-not-reached'}
			<div class="mb-4" in:fade>
				<MessageBox level="error">
					{replacePlaceholders($i18n.send.assertion.minimum_btc_amount, {
						$amount: convertSatoshisToBtc(BTC_MINIMUM_AMOUNT)
					})}
				</MessageBox>
			</div>
		{/if}

		<!-- Explains an unusable UTXO selection, which is also why no offer appeared: the
		     quote refuses to price a selection the send would reject. -->
		<div class="mb-4" data-tid="swap-btc-form-send-warnings">
			<BtcSendWarnings {pendingTransactionsStatus} {utxosFee} />
		</div>
	{/snippet}

	{#snippet swapDetails()}
		{#if nonNullish($destinationToken) && nonNullish($sourceToken)}
			<Hr spacing="md" />

			<div class="flex flex-col gap-3">
				<SwapProvider {onShowProviderList} showSelectButton {slippageValue} />

				<SwapBtcFees />
			</div>
		{/if}
	{/snippet}
</SwapForm>
