<script lang="ts">
	import { getContext } from 'svelte';
	import BtcReviewNetwork from '$btc/components/send/BtcReviewNetwork.svelte';
	import BtcUtxosFeeDisplay from '$btc/components/send/BtcUtxosFeeDisplay.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		destination?: string;
		amount?: OptionAmount;
		selectedContact?: ContactUi;
		onBack: () => void;
		onSend: () => void;
	}

	let { destination = '', amount, selectedContact, onBack, onSend }: Props = $props();

	const { sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<SendReview {amount} {destination} {onBack} {onSend} {selectedContact}>
	{#snippet network()}
		<BtcReviewNetwork networkId={$sendTokenNetworkId} />
	{/snippet}

	{#snippet fee()}
		<BtcUtxosFeeDisplay />
	{/snippet}
</SendReview>
