<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import type { EthereumNetwork } from '$eth/types/network';
	import { decodeErc20AbiDataValue } from '$eth/utils/transactions.utils';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectData from '$lib/components/wallet-connect/WalletConnectData.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Network } from '$lib/types/network';

	interface Props {
		amount: bigint;
		destination: string;
		application: string;
		data?: string;
		erc20Approve: boolean;
		sourceNetwork: EthereumNetwork;
		targetNetwork?: Network;
		onApprove: () => void;
		onReject: () => void;
	}

	let {
		amount,
		destination,
		application,
		data,
		erc20Approve,
		sourceNetwork: sourceNetworkProp,
		targetNetwork,
		onApprove,
		onReject
	}: Props = $props();

	let amountDisplay = $derived(
		erc20Approve && nonNullish(data) ? decodeErc20AbiDataValue({ data }) : amount
	);

	const { sendToken, sendTokenId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let balance = $derived($balancesStore?.[$sendTokenId]?.data);
</script>

<ContentWithToolbar>
	<SendData
		amount={amountDisplay}
		{application}
		{balance}
		{destination}
		source={$ethAddress ?? ''}
		token={$sendToken}
	>
		{#snippet sourceNetwork()}
			<WalletConnectModalValue label={$i18n.send.text.source_network} ref="source-network">
				<NetworkWithLogo network={sourceNetworkProp} />
			</WalletConnectModalValue>
		{/snippet}

		{#snippet destinationNetwork()}
			{#if nonNullish(targetNetwork)}
				<WalletConnectModalValue
					label={$i18n.send.text.destination_network}
					ref="destination-network"
				>
					<NetworkWithLogo network={targetNetwork} />
				</WalletConnectModalValue>
			{/if}
		{/snippet}

		<WalletConnectData {data} label={$i18n.wallet_connect.text.hex_data} />
	</SendData>

	{#snippet toolbar()}
		<WalletConnectActions {onApprove} {onReject} />
	{/snippet}
</ContentWithToolbar>
