<script lang="ts">
	import type { WalletKitTypes } from '@reown/walletkit';
	import EthWalletConnectMessage from '$eth/components/wallet-connect/EthWalletConnectMessage.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';

	interface Props {
		request: WalletKitTypes.SessionRequest;
		onApprove: () => void;
		onReject: () => void;
	}

	let { request, onApprove, onReject }: Props = $props();
</script>

<ContentWithToolbar>
	<EthWalletConnectMessage {request} />

	{#snippet toolbar()}
		<WalletConnectActions {onApprove} {onReject} />
	{/snippet}
</ContentWithToolbar>
