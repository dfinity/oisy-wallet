<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IcTokenFee from '$icp/components/fee/IcTokenFee.svelte';
	import IcReviewNetwork from '$icp/components/send/IcReviewNetwork.svelte';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Nft } from '$lib/types/nft';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';

	interface Props {
		destination?: string;
		amount?: OptionAmount;
		selectedContact?: ContactUi;
		nft?: Nft;
		onBack: () => void;
		onSend: () => void;
	}

	let { destination = '', amount, selectedContact, nft, onBack, onSend }: Props = $props();

	const { sendTokenStandard } = getContext<SendContext>(SEND_CONTEXT_KEY);

	// Should never happen given that the same checks are performed on previous wizard step
	let invalid = $derived(
		isNullish($sendTokenStandard) ||
			isInvalidDestinationIc({
				destination,
				tokenStandard: $sendTokenStandard
			}) ||
			(isNullish(nft) && invalidAmount(amount))
	);
</script>

<SendReview {amount} {destination} disabled={invalid} {nft} {onBack} {onSend} {selectedContact}>
	{#snippet fee()}
		<IcTokenFee />
	{/snippet}

	{#snippet network()}
		<IcReviewNetwork />
	{/snippet}
</SendReview>
