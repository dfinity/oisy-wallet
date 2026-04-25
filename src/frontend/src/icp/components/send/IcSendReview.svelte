<script lang="ts">
	import { isNullish, notEmptyString } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IcTokenFee from '$icp/components/fee/IcTokenFee.svelte';
	import IcReviewNetwork from '$icp/components/send/IcReviewNetwork.svelte';
	import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { i18n } from '$lib/stores/i18n.store';
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

	const { sendTokenStandard, sendMemo } = getContext<SendContext>(SEND_CONTEXT_KEY);

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
	{#snippet network()}
		<IcReviewNetwork />
	{/snippet}

	{#snippet memo()}
		{#if notEmptyString($sendMemo.trim())}
			<div class="mb-4">
				<p class="text-sm text-tertiary">{$i18n.send.text.memo}</p>
				<p>{$sendMemo.trim()}</p>
			</div>
		{/if}
	{/snippet}

	{#snippet fee()}
		{#if !$isIcMintingAccount}
			<IcTokenFee />
		{/if}
	{/snippet}
</SendReview>
