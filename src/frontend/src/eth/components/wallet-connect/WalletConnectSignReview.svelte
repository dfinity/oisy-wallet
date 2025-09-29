<script lang="ts">
	import type { WalletKitTypes } from '@reown/walletkit';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import EthWalletConnectMessage from '$eth/components/wallet-connect/EthWalletConnectMessage.svelte';

	interface Props {
		request: WalletKitTypes.SessionRequest;
		onApprove: () => void;
		onReject: () => void;
	}

	let { request, onApprove, onReject }: Props = $props();
</script>

<ContentWithToolbar>
	<p class="mb-0 font-bold">{$i18n.wallet_connect.text.method}:</p>
	<p class="mb-4 font-normal">
		{request.params.request.method}
	</p>

	<EthWalletConnectMessage {request} />

	{#snippet toolbar()}
		<WalletConnectActions {onApprove} {onReject} />
	{/snippet}
</ContentWithToolbar>
