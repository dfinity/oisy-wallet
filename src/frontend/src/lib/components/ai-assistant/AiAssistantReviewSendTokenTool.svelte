<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import UtxosFeeContexts from '$btc/components/fee/UtxosFeeContexts.svelte';
	import UtxosFeeLoader from '$btc/components/fee/UtxosFeeLoader.svelte';
	import { btcKnownDestinations } from '$btc/derived/btc-transactions.derived';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import AiAssistantReviewSendBtcToken from '$lib/components/ai-assistant/AiAssistantReviewSendBtcToken.svelte';
	import AiAssistantReviewSendEthToken from '$lib/components/ai-assistant/AiAssistantReviewSendEthToken.svelte';
	import AiAssistantReviewSendIcToken from '$lib/components/ai-assistant/AiAssistantReviewSendIcToken.svelte';
	import AiAssistantReviewSendSolToken from '$lib/components/ai-assistant/AiAssistantReviewSendSolToken.svelte';
	import FirstTimeDestinationWarning from '$lib/components/send/FirstTimeDestinationWarning.svelte';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendReviewDestination from '$lib/components/send/SendReviewDestination.svelte';
	import SendTokenReview from '$lib/components/tokens/SendTokenReview.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet,
		ethAddress
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ReviewSendTokensToolResult } from '$lib/types/ai-assistant';
	import { isFirstTimeDestination } from '$lib/utils/known-destinations.utils';
	import {
		isNetworkEthereum,
		isNetworkIdBitcoin,
		isNetworkIdBTCRegtest,
		isNetworkIdBTCTestnet,
		isNetworkIdICP,
		isNetworkIdSolana
	} from '$lib/utils/network.utils';
	import { getEthKnownDestinations, getIcKnownDestinations } from '$lib/utils/transactions.utils';
	import { solKnownDestinations } from '$sol/derived/sol-transactions.derived';

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

	// The send flow's known destinations follow the token of the page the user is on, while the
	// assistant can prepare a send of any token: the history is read for the token being sent. The
	// store of a chain is only subscribed when the send is on that chain.
	let knownDestinations = $derived(
		isNetworkEthereum($sendToken.network)
			? nonNullish(nativeEthereumToken)
				? getEthKnownDestinations({
						transactions: $ethTransactionsStore,
						ckMinterInfo: $ckEthMinterInfoStore?.[nativeEthereumToken.id],
						ethAddress: $ethAddress,
						tokens: $tokens,
						networkId: $sendTokenNetworkId
					})
				: undefined
			: isNetworkIdICP($sendTokenNetworkId)
				? getIcKnownDestinations({
						transactions: $icTransactionsStore,
						tokens: $tokens,
						token: $sendToken,
						identity: $authIdentity
					})
				: isNetworkIdBitcoin($sendTokenNetworkId)
					? $btcKnownDestinations
					: isNetworkIdSolana($sendTokenNetworkId)
						? $solKnownDestinations
						: undefined
	);

	let firstTimeDestination = $derived(
		sendEnabled &&
			!sendCompleted &&
			!sendOutcomeUnknown &&
			notEmptyString(destination) &&
			isFirstTimeDestination({
				destination,
				networkId: $sendTokenNetworkId,
				knownDestinations
			})
	);

	let firstTimeDestinationConfirmed = $state(false);

	let sendConfirmed = $derived(
		sendEnabled && (!firstTimeDestination || firstTimeDestinationConfirmed)
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

		<!-- Only the review that can still send asks: an older one in the chat can't be sent anyway. -->
		{#if firstTimeDestination && sendEnabled && !sendCompleted && !sendOutcomeUnknown}
			<div class="mb-4">
				<FirstTimeDestinationWarning
					confirmed={firstTimeDestinationConfirmed}
					onConfirm={() => (firstTimeDestinationConfirmed = !firstTimeDestinationConfirmed)}
					styleClass="mb-0!"
				/>
			</div>
		{/if}

		<Hr />

		{#if isNetworkEthereum($sendToken.network) && nonNullish(nativeEthereumToken)}
			<AiAssistantReviewSendEthToken
				{amount}
				{destination}
				{nativeEthereumToken}
				{onSendCompleted}
				{onSendOutcomeUnknown}
				{sendCompleted}
				sendEnabled={sendConfirmed}
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
					sendEnabled={sendConfirmed}
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
				sendEnabled={sendConfirmed}
			/>
		{:else if isNetworkIdICP($sendTokenNetworkId)}
			<AiAssistantReviewSendIcToken
				{id}
				{amount}
				{destination}
				{onSendCompleted}
				{sendCompleted}
				sendEnabled={sendConfirmed}
			/>
		{/if}
	{/snippet}
</SendTokenReview>
