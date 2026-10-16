<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy, type Snippet, untrack } from 'svelte';
	import ScannedPlainAddressNotice from '$lib/components/send/ScannedPlainAddressNotice.svelte';
	import SendFeeInfo from '$lib/components/send/SendFeeInfo.svelte';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import XrpFeeDisplay from '$xrp/components/fee/XrpFeeDisplay.svelte';
	import XrpSendAmount from '$xrp/components/send/XrpSendAmount.svelte';
	import XrpSendDestinationTag from '$xrp/components/send/XrpSendDestinationTag.svelte';
	import { loadXrpDestination } from '$xrp/services/xrp-destination.services';
	import { type XrpFeeContext, XRP_FEE_CONTEXT_KEY } from '$xrp/stores/xrp-fee.store';
	import type { XrpNetworkType } from '$xrp/types/network';
	import type { XrpAmountAssertionError, XrpDestinationFacts } from '$xrp/types/xrp-send';
	import { mapNetworkIdToNetwork } from '$xrp/utils/network.utils';
	import { invalidXrpAddress } from '$xrp/utils/xrp-address.utils';

	interface Props {
		amount: OptionAmount;
		destination?: string;
		selectedContact?: ContactUi;
		onBack: () => void;
		onNext: () => void;
		onTokensList: () => void;
		cancel: Snippet;
	}

	let {
		amount = $bindable(),
		destination = $bindable(''),
		selectedContact,
		onBack,
		onNext,
		onTokensList,
		cancel
	}: Props = $props();

	const { sendBalance, sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const {
		feeDecimalsStore,
		feeStore: fee,
		feeSymbolStore,
		feeTokenIdStore,
		reserveStore: reserve
	}: XrpFeeContext = getContext<XrpFeeContext>(XRP_FEE_CONTEXT_KEY);

	let amountError = $state<XrpAmountAssertionError | undefined>();

	// A tag the user typed but that does not parse must block the form rather than be dropped:
	// sending to an exchange deposit address without its tag is not auto-creditable.
	let invalidDestinationTag = $state(false);

	let invalidDestination = $derived(
		isNullishOrEmpty(destination) || invalidXrpAddress(destination)
	);

	let network = $derived(
		nonNullish($sendToken) ? mapNetworkIdToNetwork($sendToken.network.id) : undefined
	);

	// The recipient as the ledger reports it, read with the same lookup `sendXrp` decides on, so the
	// form can show a refusal before Next that the send would otherwise make only after Send.
	// `undefined` while the lookup runs.
	let destinationFacts = $state<XrpDestinationFacts | undefined>();

	// One per lookup, so an answer for a destination the form has moved off, or one arriving after
	// the form is gone, cannot land.
	let generation = 0;

	const loadDestination = async ({ id, network }: { id: number; network: XrpNetworkType }) => {
		const facts = await loadXrpDestination({ destination, network });

		if (id !== generation) {
			return;
		}

		destinationFacts = facts;
	};

	$effect(() => {
		[destination, network];

		untrack(() => {
			const id = ++generation;

			destinationFacts = undefined;

			if (invalidDestination || isNullish(network)) {
				return;
			}

			void loadDestination({ id, network });
		});
	});

	onDestroy(() => generation++);

	// Only an answer counts: both snapshots read, and the account missing from at least one. A lookup
	// still running, or one that failed, decides nothing here — the form does not wait for it, and
	// `sendXrp` reads the destination again before signing and refuses there.
	let destinationUnfunded = $derived(
		nonNullish(destinationFacts) &&
			isNullish(destinationFacts.unavailable) &&
			!destinationFacts.settled
	);

	// `invalidAmount`, not `isNullish`, and it subsumes it. `TokenInputContent` treats an empty
	// string and a negative number as nothing to judge — it clears the error and returns — so
	// neither sets `amountError`, and neither is nullish. Without this they leave the step for a
	// review whose Send is disabled by the same predicate, with no message saying why. The send
	// guards cannot help there: they run on a click that cannot happen.
	//
	// The three figures an amount is measured against: what the account must retain, what leaves
	// with the payment, and what it has. While any of them is unknown no amount can be judged
	// sendable, so the form is blocked outright rather than measured against a guessed figure —
	// which also keeps Next from reaching a review step that would price the send without showing
	// a fee. The balance belongs here for the same reason as the other two and is the one that can
	// also go missing later, on any failed reload: `XrpSendAmount` skips its funds comparison when
	// the balance is nullish, so nothing else would stop the amount.
	let invalid = $derived(
		invalidDestination ||
			invalidDestinationTag ||
			isNullish($reserve) ||
			isNullish($fee) ||
			isNullish($sendBalance) ||
			nonNullish(amountError) ||
			invalidAmount(amount)
	);
</script>

<SendForm
	{cancel}
	{destination}
	disabled={invalid}
	{invalidDestination}
	{onBack}
	{onNext}
	{selectedContact}
>
	{#snippet topBanner()}
		<ScannedPlainAddressNotice styleClass="mb-6!" />
	{/snippet}

	{#snippet sendAmount()}
		<XrpSendAmount {destinationUnfunded} {onTokensList} bind:amount bind:amountError />
		<XrpSendDestinationTag bind:invalidDestinationTag />
	{/snippet}

	{#snippet fee()}
		<XrpFeeDisplay />
	{/snippet}

	{#snippet info()}
		<SendFeeInfo
			decimals={$feeDecimalsStore}
			feeSymbol={$feeSymbolStore}
			feeTokenId={$feeTokenIdStore}
		/>
	{/snippet}
</SendForm>
