<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import UtxosFeeContexts from '$btc/components/fee/UtxosFeeContexts.svelte';
	import UtxosFeeLoader from '$btc/components/fee/UtxosFeeLoader.svelte';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import AiAssistantReviewSendBtcToken from '$lib/components/ai-assistant/AiAssistantReviewSendBtcToken.svelte';
	import AiAssistantReviewSendEthToken from '$lib/components/ai-assistant/AiAssistantReviewSendEthToken.svelte';
	import AiAssistantReviewSendIcToken from '$lib/components/ai-assistant/AiAssistantReviewSendIcToken.svelte';
	import AiAssistantReviewSendSolToken from '$lib/components/ai-assistant/AiAssistantReviewSendSolToken.svelte';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendReviewDestination from '$lib/components/send/SendReviewDestination.svelte';
	import SendTokenReview from '$lib/components/tokens/SendTokenReview.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet
	} from '$lib/derived/address.derived';
	import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ReviewSendTokensToolResult } from '$lib/types/ai-assistant';
	import {
		isNetworkEthereum,
		isNetworkIdBitcoin,
		isNetworkIdBTCRegtest,
		isNetworkIdBTCTestnet,
		isNetworkIdICP,
		isNetworkIdSolana
	} from '$lib/utils/network.utils';

	interface Props extends ReviewSendTokensToolResult {
		sendEnabled: boolean;
	}

	let {
		amount,
		contact,
		address,
		contactAddress,
		sendEnabled,
		sendCompleted,
		sendOutcomeUnknown = false,
		id
	}: Props = $props();

	const { sendToken, sendTokenExchangeRate, sendTokenNetworkId } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let destination = $derived(contactAddress?.address ?? address ?? '');

	// One source for both the fee loader and the send: the loader selects the UTXOs that
	// `AiAssistantReviewSendBtcToken` then validates and spends. Read the address stores
	// reactively, so an address that loads after the review renders still reaches both.
	let btcSource = $derived(
		(isNetworkIdBTCTestnet($sendTokenNetworkId)
			? $btcAddressTestnet
			: isNetworkIdBTCRegtest($sendTokenNetworkId)
				? $btcAddressRegtest
				: $btcAddressMainnet) ?? ''
	);

	// The assistant picks the token from every enabled network, whichever one the navigation has
	// selected. The review states the token's own network, so that is the network the send signs on
	// and the one whose native token pays the fee.
	let nativeEthereumToken = $derived(
		[...$enabledEthereumTokens, ...$enabledEvmTokens].find(
			({ network: { id: networkId } }) => $sendToken.network.id === networkId
		)
	);

	const onSendCompleted = () => {
		aiAssistantStore.setSendToolActionAsCompleted(id);
	};

	const onSendOutcomeUnknown = () => {
		aiAssistantStore.setSendToolActionAsOutcomeUnknown(id);
	};
</script>

<SendTokenReview
	exchangeRate={$sendTokenExchangeRate}
	sendAmount={amount}
	token={$sendToken}
	variant={sendCompleted ? 'success' : 'default'}
>
	{#snippet subtitle()}
		{$i18n.send.text.send_review_subtitle}
	{/snippet}

	{#snippet content()}
		<SendReviewDestination aiAssistantConsoleView={true} {destination} selectedContact={contact} />

		<div class="mt-4 mb-2">
			<ReviewNetwork sourceNetwork={$sendToken.network} />
		</div>

		<Hr />

		{#if isNetworkEthereum($sendToken.network) && nonNullish(nativeEthereumToken)}
			<AiAssistantReviewSendEthToken
				{amount}
				{destination}
				{nativeEthereumToken}
				{onSendCompleted}
				{onSendOutcomeUnknown}
				{sendCompleted}
				{sendEnabled}
				{sendOutcomeUnknown}
				sourceNetwork={$sendToken.network}
			/>
		{:else if isNetworkIdBitcoin($sendTokenNetworkId)}
			<UtxosFeeContexts>
				<!-- The loaders only guard against a nullish source: an empty one, before the
				     address has loaded, would query the bitcoin canister for no address. So the
				     loader mounts beside the review, once the address is there. -->
				{#if notEmptyString(btcSource)}
					<UtxosFeeLoader
						{amount}
						{destination}
						networkId={$sendTokenNetworkId}
						source={btcSource}
					/>
				{/if}
				<AiAssistantReviewSendBtcToken
					{amount}
					{destination}
					{onSendCompleted}
					{onSendOutcomeUnknown}
					{sendCompleted}
					{sendEnabled}
					{sendOutcomeUnknown}
					source={btcSource}
				/>
			</UtxosFeeContexts>
		{:else if isNetworkIdSolana($sendToken.network.id)}
			<AiAssistantReviewSendSolToken
				{amount}
				{destination}
				{onSendCompleted}
				{sendCompleted}
				{sendEnabled}
			/>
		{:else if isNetworkIdICP($sendTokenNetworkId)}
			<AiAssistantReviewSendIcToken
				{id}
				{amount}
				{destination}
				{onSendCompleted}
				{sendCompleted}
				{sendEnabled}
			/>
		{/if}
	{/snippet}
</SendTokenReview>
