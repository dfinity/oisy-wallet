<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import ScannedPlainAddressNotice from '$lib/components/send/ScannedPlainAddressNotice.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Network } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { formatToken } from '$lib/utils/format.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { tryParseToken } from '$lib/utils/parse.utils';
	import XrpFeeDisplay from '$xrp/components/fee/XrpFeeDisplay.svelte';
	import { XRP_FEE_CONTEXT_KEY, type XrpFeeContext } from '$xrp/stores/xrp-fee.store';
	import { invalidXrpAddress } from '$xrp/utils/xrp-address.utils';
	import { getXrpTokenSendMax, isTokenXrpTrustLine } from '$xrp/utils/xrp-trust-line.utils';

	interface Props {
		destination: string;
		amount: OptionAmount;
		network?: Network;
		selectedContact?: ContactUi;
		onBack: () => void;
		onSend: () => void;
	}

	const {
		destination = '',
		amount,
		network: sourceNetwork,
		selectedContact,
		onBack,
		onSend
	}: Props = $props();

	const { sendXrpDestinationTag, sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const { transferRateStore }: XrpFeeContext = getContext<XrpFeeContext>(XRP_FEE_CONTEXT_KEY);

	let invalid = $derived(invalidXrpAddress(destination) || invalidAmount(amount));

	// What a token's issuer charges on top of the amount, which the sender pays: none on a payment
	// to the issuer itself.
	let transferFee = $derived.by(() => {
		if (
			isNullish($sendToken) ||
			!isTokenXrpTrustLine($sendToken) ||
			destination === $sendToken.issuer ||
			isNullish($transferRateStore)
		) {
			return;
		}

		const units = tryParseToken({ value: `${amount}`, unitName: $sendToken.decimals });

		if (isNullish(units)) {
			return;
		}

		const sendMax = getXrpTokenSendMax({ amount: units, transferRate: $transferRateStore });

		return nonNullish(sendMax) ? sendMax - units : undefined;
	});
</script>

<SendReview {amount} {destination} disabled={invalid} {onBack} {onSend} {selectedContact}>
	{#snippet topBanner()}
		<ScannedPlainAddressNotice styleClass="mb-6!" />
	{/snippet}

	{#snippet network()}
		<ReviewNetwork {sourceNetwork} />
	{/snippet}

	{#snippet fee()}
		<XrpFeeDisplay />
	{/snippet}

	{#snippet info()}
		{#if nonNullish(transferFee) && nonNullish($sendToken)}
			<div class="flex justify-between gap-4 py-2" data-tid="xrp-review-transfer-fee">
				<span class="text-tertiary">{$i18n.send.text.xrp_transfer_fee}</span>
				<span
					>{formatToken({
						value: transferFee,
						unitName: $sendToken.decimals,
						displayDecimals: $sendToken.decimals
					})}
					{$sendToken.symbol}</span
				>
			</div>
		{/if}

		{#if nonNullish($sendXrpDestinationTag)}
			<div class="flex justify-between gap-4 py-2" data-tid="xrp-review-destination-tag">
				<span class="text-tertiary">{$i18n.send.text.xrp_destination_tag}</span>
				<span>{$sendXrpDestinationTag}</span>
			</div>
		{:else}
			<!-- "may be required": addresses flagged as requiring a tag are already refused on send,
			so this covers exchange deposit addresses that need a tag but do not set the flag. -->
			<MessageBox
				level="warning"
				styleClass="mt-4 mb-0!"
				testId="xrp-review-destination-tag-missing"
			>
				{$i18n.send.info.xrp_destination_tag_missing}
			</MessageBox>
		{/if}
	{/snippet}
</SendReview>
