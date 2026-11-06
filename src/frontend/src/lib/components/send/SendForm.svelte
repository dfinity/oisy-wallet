<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
	import SendTokenDetails from '$lib/components/send/SendTokenDetails.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonNext from '$lib/components/ui/ButtonNext.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { SEND_FORM_NEXT_BUTTON } from '$lib/constants/test-ids.constants';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import { preventDefault } from '$lib/utils/event-modifiers.utils';

	interface Props {
		destination?: string;
		invalidDestination?: boolean;
		disabled?: boolean;
		selectedContact?: ContactUi;
		onBack: () => void;
		onNext: () => void;
		sendAmount: Snippet;
		priority?: Snippet;
		fee?: Snippet;
		info?: Snippet;
		cancel: Snippet;
		topBanner?: Snippet;
	}

	let {
		destination = '',
		invalidDestination = false,
		disabled = false,
		selectedContact,
		onBack,
		onNext,
		sendAmount,
		priority,
		fee,
		info,
		cancel,
		topBanner
	}: Props = $props();

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const back = () => onBack();
</script>

<form method="POST" onsubmit={preventDefault(onNext)}>
	<ContentWithToolbar>
		{@render topBanner?.()}

		{@render sendAmount()}

		<SendDestination
			{destination}
			{invalidDestination}
			onSendDestinationStep={back}
			{selectedContact}
		/>

		<!-- Same lines, in the same order, as the review step: the token is named by its network,
			 symbol, name and address, never by a symbol alone, which any token can copy. -->
		<ReviewNetwork sourceNetwork={$sendToken.network} />

		<SendTokenDetails token={$sendToken} />

		{@render priority?.()}

		{@render fee?.()}

		{@render info?.()}

		{#snippet toolbar()}
			<ButtonGroup testId="toolbar">
				{@render cancel()}

				<ButtonNext {disabled} testId={SEND_FORM_NEXT_BUTTON} />
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</form>
