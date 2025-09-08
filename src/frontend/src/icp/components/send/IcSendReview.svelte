<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IcTokenFee from '$icp/components/fee/IcTokenFee.svelte';
	import IcReviewNetwork from '$icp/components/send/IcReviewNetwork.svelte';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';

	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let selectedContact: ContactUi | undefined = undefined;

	const { sendTokenStandard } = getContext<SendContext>(SEND_CONTEXT_KEY);

	// Should never happen given that the same checks are performed on previous wizard step
	let invalid = true;
	$: invalid =
		isNullish($sendTokenStandard) ||
		isInvalidDestinationIc({
			destination,
			tokenStandard: $sendTokenStandard
		}) ||
		invalidAmount(amount);
</script>

<SendReview {amount} {destination} disabled={invalid} {selectedContact} on:icBack on:icSend>
	<IcTokenFee slot="fee" />

	<IcReviewNetwork slot="network" />
</SendReview>
