<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IcFeeDisplay from '$icp/components/send/IcFeeDisplay.svelte';
	import IcReviewNetwork from '$icp/components/send/IcReviewNetwork.svelte';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';

	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let source: string;

	const { sendTokenStandard } = getContext<SendContext>(SEND_CONTEXT_KEY);

	// Should never happen given that the same checks are performed on previous wizard step
	let invalid = true;
	$: invalid =
		isNullish($sendTokenStandard) ||
		isInvalidDestinationIc({
			destination,
			tokenStandard: $sendTokenStandard,
			networkId
		}) ||
		invalidAmount(amount);
</script>

<SendReview on:icBack on:icSend {source} {amount} {destination} disabled={invalid}>
	<IcFeeDisplay slot="fee" {networkId} />

	<IcReviewNetwork {networkId} slot="network" />
</SendReview>
