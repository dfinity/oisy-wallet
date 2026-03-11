<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { ercFungibleTokens } from '$eth/derived/erc-fungible.derived';
	import type { EthereumNetwork } from '$eth/types/network';
	import { decodeErc20AbiData } from '$eth/utils/transactions.utils';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import SendDataSpender from '$lib/components/send/SendDataSpender.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectData from '$lib/components/wallet-connect/WalletConnectData.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Network } from '$lib/types/network';
	import { areAddressesEqual } from '$lib/utils/address.utils';

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

	let { to: spender, value: amountDisplay } = $derived(
		erc20Approve && nonNullish(data)
			? decodeErc20AbiData({ data })
			: { to: destination, value: amount }
	);

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let token = $derived(
		erc20Approve
			? $ercFungibleTokens.find(
					({ address, network: { id: networkId } }) =>
						areAddressesEqual({ address1: address, address2: destination, networkId }) &&
						networkId === sourceNetworkProp.id
				)
			: $sendToken
	);

	let balance = $derived(nonNullish(token) ? $balancesStore?.[token.id]?.data : undefined);
</script>

<ContentWithToolbar>
	<SendData
		amount={amountDisplay}
		{application}
		{balance}
		{destination}
		showUnlimitedAmountLabel={erc20Approve}
		source={$ethAddress ?? ''}
		{token}
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

		{#if erc20Approve && nonNullish(spender)}
			<SendDataSpender {spender} />
		{/if}

		<WalletConnectData {data} label={$i18n.wallet_connect.text.hex_data} />
	</SendData>

	{#snippet toolbar()}
		<WalletConnectActions {onApprove} {onReject} />
	{/snippet}
</ContentWithToolbar>
