<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { run } from 'svelte/legacy';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { isEthAddress } from '$lib/utils/account.utils';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		destination?: string;
		amount?: OptionAmount;
		selectedContact?: ContactUi;
	}

	let { destination = '', amount = undefined, selectedContact = undefined }: Props = $props();

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const { feeStore: storeFeeData }: EthFeeContext = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	let invalid = $state(true);
	run(() => {
		invalid =
			isNullishOrEmpty(destination) ||
			!isEthAddress(destination) ||
			invalidAmount(amount) ||
			isNullish($storeFeeData);
	});
</script>

<SendReview {amount} {destination} disabled={invalid} {selectedContact} on:icBack on:icSend>
	<EthFeeDisplay slot="fee">
		{#snippet label()}
			<Html text={$i18n.fee.text.max_fee_eth} />
		{/snippet}
	</EthFeeDisplay>

	{#snippet network()}
		<ReviewNetwork sourceNetwork={$sendToken.network} />
	{/snippet}
</SendReview>
