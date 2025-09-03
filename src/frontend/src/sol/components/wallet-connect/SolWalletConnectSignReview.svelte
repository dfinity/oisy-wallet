<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectData from '$lib/components/wallet-connect/WalletConnectData.svelte';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';

	interface Props {
		amount?: bigint;
		destination: string;
		source: string;
		data?: string;
		token: Token;
		onApprove: () => void;
		onReject: () => void;
	}

	let { amount, destination,source, data, token, onApprove, onReject }: Props = $props();

	let balance = $derived($balancesStore?.[token.id]?.data);

	let amountDisplay = $derived(
		nonNullish(amount) ? formatToken({ value: amount, unitName: token.decimals }) : undefined
	);
</script>

<ContentWithToolbar>
	<SendData
		amount={amountDisplay}
		{balance}
		{destination}
		showNullishAmountLabel
		{source}
		{token}
	>
		<WalletConnectData {data} label={$i18n.wallet_connect.text.hex_data} />

		<!-- TODO: add checks for insufficient funds if and when we are able to correctly parse the amount -->

		<ReviewNetwork slot="network" sourceNetwork={token.network} />
	</SendData>

	{#snippet toolbar()}
		<WalletConnectActions {onApprove} {onReject} />
	{/snippet}
</ContentWithToolbar>
