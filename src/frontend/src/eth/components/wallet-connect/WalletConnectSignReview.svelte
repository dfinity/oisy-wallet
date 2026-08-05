<script lang="ts">
	import type { WalletKitTypes } from '@reown/walletkit';
	import EthWalletConnectMessage from '$eth/components/wallet-connect/EthWalletConnectMessage.svelte';
	import { hasInvalidTypedDataParams } from '$eth/utils/wallet-connect.utils';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';

	interface Props {
		request: WalletKitTypes.SessionRequest;
		onApprove: () => void;
		onReject: () => void;
	}

	let { request, onApprove, onReject }: Props = $props();

	// The signer rejects a type-invalid EIP-712 payload; mirror that in the review
	// so the user sees a warning and cannot approve what would not be signed.
	let invalidTypedData = $derived(hasInvalidTypedDataParams(request.params.request.params));
</script>

<ContentWithToolbar>
	<EthWalletConnectMessage {invalidTypedData} {request} />

	{#snippet toolbar()}
		<WalletConnectActions approveDisabled={invalidTypedData} {onApprove} {onReject} />
	{/snippet}
</ContentWithToolbar>
