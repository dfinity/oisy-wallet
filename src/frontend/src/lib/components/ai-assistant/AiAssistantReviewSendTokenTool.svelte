<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { ethereumToken } from '$eth/derived/token.derived';
	import type { EthereumNetwork } from '$eth/types/network';
	import { selectedEvmNetwork } from '$evm/derived/network.derived';
	import { evmNativeToken } from '$evm/derived/token.derived';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import AiAssistantReviewSendBtcToken from '$lib/components/ai-assistant/AiAssistantReviewSendBtcToken.svelte';
	import AiAssistantReviewSendEthToken from '$lib/components/ai-assistant/AiAssistantReviewSendEthToken.svelte';
	import AiAssistantReviewSendIcToken from '$lib/components/ai-assistant/AiAssistantReviewSendIcToken.svelte';
	import AiAssistantReviewSendSolToken from '$lib/components/ai-assistant/AiAssistantReviewSendSolToken.svelte';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendReviewDestination from '$lib/components/send/SendReviewDestination.svelte';
	import SendTokenReview from '$lib/components/tokens/SendTokenReview.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ReviewSendTokensToolResult } from '$lib/types/ai-assistant';
	import {
		isNetworkIdBitcoin,
		isNetworkIdEthereum,
		isNetworkIdEvm,
		isNetworkIdICP,
		isNetworkIdSolana
	} from '$lib/utils/network.utils';

	type Props = ReviewSendTokensToolResult;

	let { amount, contact, address, contactAddress }: Props = $props();

	const { sendToken, sendTokenExchangeRate, sendTokenNetworkId } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let destination = $derived(contactAddress?.address ?? address ?? '');

	let fallbackEvmToken = $derived(
		$enabledEvmTokens.find(({ network: { id: networkId } }) => $sendToken.network.id === networkId)
	);

	let evmNativeEthereumToken = $derived($evmNativeToken ?? fallbackEvmToken);

	let sendCompleted = $state(false);
</script>

<SendTokenReview
	exchangeRate={$sendTokenExchangeRate}
	sendAmount={amount}
	token={$sendToken}
	variant={sendCompleted ? 'success' : 'default'}
>
	{#snippet content()}
		<SendReviewDestination aiAssistantConsoleView={true} {destination} selectedContact={contact} />

		<div class="mb-2 mt-4">
			<ReviewNetwork sourceNetwork={$sendToken.network} />
		</div>

		<Hr />

		{#if isNetworkIdEthereum($sendTokenNetworkId)}
			<AiAssistantReviewSendEthToken
				{amount}
				{destination}
				nativeEthereumToken={$ethereumToken}
				sourceNetwork={$selectedEthereumNetwork ?? DEFAULT_ETHEREUM_NETWORK}
				bind:sendCompleted
			/>
		{:else if isNetworkIdEvm($sendToken.network.id) && nonNullish(evmNativeEthereumToken)}
			<AiAssistantReviewSendEthToken
				{amount}
				{destination}
				nativeEthereumToken={evmNativeEthereumToken}
				sourceNetwork={$selectedEvmNetwork ?? ($sendToken.network as EthereumNetwork)}
				bind:sendCompleted
			/>
		{:else if isNetworkIdBitcoin($sendTokenNetworkId)}
			<AiAssistantReviewSendBtcToken {amount} {destination} bind:sendCompleted />
		{:else if isNetworkIdSolana($sendToken.network.id)}
			<AiAssistantReviewSendSolToken {amount} {destination} bind:sendCompleted />
		{:else if isNetworkIdICP($sendTokenNetworkId)}
			<AiAssistantReviewSendIcToken {amount} {destination} bind:sendCompleted />
		{/if}
	{/snippet}
</SendTokenReview>
