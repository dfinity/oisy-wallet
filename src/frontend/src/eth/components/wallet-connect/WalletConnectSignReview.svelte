<script lang="ts">
	import type { WalletKitTypes } from '@reown/walletkit';
	import EthWalletConnectMessage from '$eth/components/wallet-connect/EthWalletConnectMessage.svelte';
	import { hasInvalidTypedData, hasUnreviewableTypedData } from '$eth/utils/wallet-connect.utils';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectAcknowledgement from '$lib/components/wallet-connect/WalletConnectAcknowledgement.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		request: WalletKitTypes.SessionRequest;
		onApprove: () => void;
		onReject: () => void;
	}

	let { request, onApprove, onReject }: Props = $props();

	// The signer rejects an eth_signTypedData_v4 request that fails to parse, validate, hash, or
	// that is on a chain this session was not granted; mirror that in the review so the user sees a
	// warning and cannot approve what would not be signed.
	let invalidTypedData = $derived(
		hasInvalidTypedData({
			method: request.params.request.method,
			params: request.params.request.params,
			sessionChainId: request.params.chainId
		})
	);

	// Signable, but not describable: the struct is valid and would be signed, and OISY cannot say
	// what signing it would authorize.
	let unreviewableTypedData = $derived(
		hasUnreviewableTypedData({
			method: request.params.request.method,
			params: request.params.request.params,
			sessionChainId: request.params.chainId
		})
	);

	// Blocking every schema OISY does not recognise would stop the user signing an order, a vote or
	// a login, so the signature is gated on them stating they understand the review cannot describe
	// it rather than withheld.
	let acknowledgedUnreviewableTypedData = $state(false);
</script>

<ContentWithToolbar>
	<EthWalletConnectMessage {invalidTypedData} {request} {unreviewableTypedData} />

	{#if unreviewableTypedData}
		<WalletConnectAcknowledgement
			inputId="eth-wallet-connect-unreviewable-typed-data-agreement"
			testId="wallet-connect-unreviewable-typed-data-agreement"
			text={$i18n.wallet_connect.text.unreviewable_typed_data_agreement}
			bind:checked={acknowledgedUnreviewableTypedData}
		/>
	{/if}

	{#snippet toolbar()}
		<WalletConnectActions
			approveDisabled={invalidTypedData ||
				(unreviewableTypedData && !acknowledgedUnreviewableTypedData)}
			{onApprove}
			{onReject}
		/>
	{/snippet}
</ContentWithToolbar>
