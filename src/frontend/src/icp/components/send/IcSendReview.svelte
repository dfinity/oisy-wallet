<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import type { NetworkId } from '$lib/types/network';
	import { invalidAmount } from '$lib/utils/input.utils';

	export let destination = '';
	export let amount: number | undefined = undefined;
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

<SendReview on:icBack on:icSend {source} {amount} {destination} disabled={invalid} />
