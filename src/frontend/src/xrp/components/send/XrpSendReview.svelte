<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import ScannedPlainAddressNotice from '$lib/components/send/ScannedPlainAddressNotice.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Network } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';
	import XrpFeeDisplay from '$xrp/components/fee/XrpFeeDisplay.svelte';
	import { invalidXrpAddress } from '$xrp/utils/xrp-address.utils';

	interface Props {
		destination: string;
		amount: OptionAmount;
		network?: Network;
		selectedContact?: ContactUi;
		onBack: () => void;
		onSend: () => void;
	}

	const {
		destination = '',
		amount,
		network: sourceNetwork,
		selectedContact,
		onBack,
		onSend
	}: Props = $props();

	const { sendXrpDestinationTag } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let invalid = $derived(invalidXrpAddress(destination) || invalidAmount(amount));
</script>

<SendReview {amount} {destination} disabled={invalid} {onBack} {onSend} {selectedContact}>
	{#snippet topBanner()}
		<ScannedPlainAddressNotice styleClass="mb-6!" />
	{/snippet}

	{#snippet network()}
		<ReviewNetwork {sourceNetwork} />
	{/snippet}

	{#snippet fee()}
		<XrpFeeDisplay />
	{/snippet}

	{#snippet info()}
		{#if nonNullish($sendXrpDestinationTag)}
			<div class="flex justify-between gap-4 py-2" data-tid="xrp-review-destination-tag">
				<span class="text-tertiary">{$i18n.send.text.xrp_destination_tag}</span>
				<span>{$sendXrpDestinationTag}</span>
			</div>
		{/if}
	{/snippet}
</SendReview>
