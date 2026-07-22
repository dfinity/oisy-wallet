<script lang="ts">
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		application: string;
		method: string;
		message: string;
		source: string;
		onApprove: () => void;
		onReject: () => void;
	}

	let { application, method, message, source, onApprove, onReject }: Props = $props();
</script>

<ContentWithToolbar>
	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.application}</p>
	<p class="mb-4 font-normal">{application}</p>

	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.method}</p>
	<p class="mb-4 font-normal">{method}</p>

	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.signing_address}</p>
	<p class="mb-4 font-normal"><output class="break-all">{source}</output></p>

	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.message}</p>
	<p class="mb-4 font-normal"><output class="break-all">{message}</output></p>

	{#snippet toolbar()}
		<WalletConnectActions {onApprove} {onReject} />
	{/snippet}
</ContentWithToolbar>
