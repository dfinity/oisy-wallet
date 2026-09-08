<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext, onMount } from 'svelte';
	import { SEND_TRANSACTION_PRIORITY_ENABLED } from '$env/send-transaction-priority.env';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import { ETH_FEE_REVIEW_EXPIRY_DELAY } from '$eth/constants/eth.constants';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import { isEthAddress } from '$eth/utils/account.utils';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { REVIEW_FORM_FEE_EXPIRED } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Nft } from '$lib/types/nft';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		destination?: string;
		amount?: OptionAmount;
		selectedContact?: ContactUi;
		nft?: Nft;
		onBack: () => void;
		onSend: () => void;
	}

	let { destination = '', amount, selectedContact, nft, onBack, onSend }: Props = $props();

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const { feeStore: storeFeeData }: EthFeeContext = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	// The fee is frozen for as long as this step is on screen, so it ages here. Rather than sign at
	// a price the network has since left behind, the send is blocked once it has aged too far. The
	// step is mounted afresh on every entry, so going back and returning starts a new minute against
	// the fee that fetching, resumed meanwhile, has brought back.
	let feeExpired = $state(false);

	onMount(() => {
		const timer = setTimeout(() => (feeExpired = true), ETH_FEE_REVIEW_EXPIRY_DELAY);

		return () => clearTimeout(timer);
	});

	let invalid = $derived(
		isNullishOrEmpty(destination) ||
			!isEthAddress(destination) ||
			(isNullish(nft) && invalidAmount(amount)) ||
			isNullish($storeFeeData) ||
			feeExpired
	);
</script>

<SendReview {amount} {destination} disabled={invalid} {nft} {onBack} {onSend} {selectedContact}>
	{#snippet fee()}
		<EthFeeDisplay estimated={SEND_TRANSACTION_PRIORITY_ENABLED}>
			{#snippet label()}
				<Html
					text={SEND_TRANSACTION_PRIORITY_ENABLED
						? $i18n.fee.text.estimated_fee_eth
						: $i18n.fee.text.max_fee_eth}
				/>
			{/snippet}
		</EthFeeDisplay>
	{/snippet}

	{#snippet info()}
		{#if feeExpired}
			<MessageBox testId={REVIEW_FORM_FEE_EXPIRED}>{$i18n.send.info.fee_expired}</MessageBox>
		{/if}
	{/snippet}

	{#snippet network()}
		<ReviewNetwork sourceNetwork={$sendToken.network} />
	{/snippet}
</SendReview>
