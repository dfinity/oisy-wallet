<script lang="ts">
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import SendDataSpender from '$lib/components/send/SendDataSpender.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectData from '$lib/components/wallet-connect/WalletConnectData.svelte';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';

	interface Props {
		amount?: bigint;
		destination: string;
		source: string;
		application: string;
		data?: string;
		token: Token;
		isApproval?: boolean;
		unreviewed?: boolean;
		onApprove: () => void;
		onReject: () => void;
	}

	let {
		amount,
		destination,
		source,
		application,
		data,
		token,
		isApproval = false,
		unreviewed = false,
		onApprove,
		onReject
	}: Props = $props();

	let balance = $derived($balancesStore?.[token.id]?.data);
</script>

<ContentWithToolbar>
	<SendData
		{amount}
		{application}
		{balance}
		destination={isApproval ? null : destination}
		{source}
		{token}
	>
		{#if isApproval}
			<SendDataSpender spender={destination} />
		{/if}

		{#if unreviewed}
			<MessageBox level="warning">{$i18n.wallet_connect.text.unreviewed_instructions}</MessageBox>
		{/if}

		<WalletConnectData {data} label={$i18n.wallet_connect.text.hex_data} />

		<!-- TODO: add checks for insufficient funds if and when we are able to correctly parse the amount -->

		{#snippet sourceNetwork()}
			<ReviewNetwork sourceNetwork={token.network} />
		{/snippet}
	</SendData>

	{#snippet toolbar()}
		<WalletConnectActions {onApprove} {onReject} />
	{/snippet}
</ContentWithToolbar>
