<script lang="ts">
	import type { WalletKitTypes } from '@reown/walletkit';
	import EthWalletConnectMessage from '$eth/components/wallet-connect/EthWalletConnectMessage.svelte';
	import { hasInvalidTypedData } from '$eth/utils/wallet-connect.utils';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';

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
</script>

<ContentWithToolbar>
	<EthWalletConnectMessage {invalidTypedData} {request} />

	{#snippet toolbar()}
		<WalletConnectActions approveDisabled={invalidTypedData} {onApprove} {onReject} />
	{/snippet}
</ContentWithToolbar>
