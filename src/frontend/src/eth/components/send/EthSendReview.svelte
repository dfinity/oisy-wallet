<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Nft } from '$lib/types/nft';
	import type { OptionAmount } from '$lib/types/send';
	import { isEthAddress } from '$lib/utils/account.utils';
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

	let invalid = $derived(
		isNullishOrEmpty(destination) ||
			!isEthAddress(destination) ||
			(isNullish(nft) && invalidAmount(amount)) ||
			isNullish($storeFeeData)
	);
</script>

<SendReview {amount} {destination} disabled={invalid} {nft} {onBack} {onSend} {selectedContact}>
	{#snippet fee()}
		<EthFeeDisplay>
			{#snippet label()}
				<Html text={$i18n.fee.text.max_fee_eth} />
			{/snippet}
		</EthFeeDisplay>
	{/snippet}

	{#snippet network()}
		<ReviewNetwork sourceNetwork={$sendToken.network} />
	{/snippet}
</SendReview>
