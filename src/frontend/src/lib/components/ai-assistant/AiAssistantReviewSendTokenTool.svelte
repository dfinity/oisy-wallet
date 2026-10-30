<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
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
	import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ReviewSendTokensToolResult } from '$lib/types/ai-assistant';
	import {
		isNetworkEthereum,
		isNetworkIdBitcoin,
		isNetworkIdICP,
		isNetworkIdSolana
	} from '$lib/utils/network.utils';

	interface Props extends ReviewSendTokensToolResult {
		sendEnabled: boolean;
	}

	let { amount, contact, address, contactAddress, sendEnabled, sendCompleted, id }: Props =
		$props();

	const { sendToken, sendTokenExchangeRate, sendTokenNetworkId } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let destination = $derived(contactAddress?.address ?? address ?? '');

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
				{sendCompleted}
				{sendEnabled}
				sourceNetwork={$sendToken.network}
			/>
		{:else if isNetworkIdBitcoin($sendTokenNetworkId)}
			<UtxosFeeContexts>
				<UtxosFeeLoader {amount} networkId={$sendTokenNetworkId} source={destination}>
					<AiAssistantReviewSendBtcToken
						{amount}
						{destination}
						{onSendCompleted}
						{sendCompleted}
						{sendEnabled}
					/>
				</UtxosFeeLoader>
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
				{amount}
				{destination}
				{onSendCompleted}
				{sendCompleted}
				{sendEnabled}
			/>
		{/if}
	{/snippet}
</SendTokenReview>
