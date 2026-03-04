<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
	import { ercFungibleTokens } from '$eth/derived/erc-fungible.derived';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import type { EthereumNetwork } from '$eth/types/network';
	import { decodeErc20AbiData, mapAddressToName } from '$eth/utils/transactions.utils';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import SendDataDestination from '$lib/components/send/SendDataDestination.svelte';
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
	import { isNetworkIdSepolia } from '$lib/utils/network.utils';

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

	let ckMinterInfo = $derived(
		$ckEthMinterInfoStore?.[
			isNetworkIdSepolia(sourceNetworkProp.id) ? SEPOLIA_TOKEN_ID : ETHEREUM_TOKEN_ID
		]
	);

	let destinationResolvedName = $derived(
		mapAddressToName({
			address: destination,
			networkId: sourceNetworkProp.id,
			erc20Tokens: $erc20Tokens,
			ckMinterInfo
		}) ?? undefined
	);

	let spenderResolvedName = $derived(
		erc20Approve
			? (mapAddressToName({
					address: spender,
					networkId: sourceNetworkProp.id,
					erc20Tokens: $erc20Tokens,
					ckMinterInfo
				}) ?? undefined)
			: undefined
	);
</script>

<ContentWithToolbar>
	<SendData
		amount={amountDisplay}
		{application}
		{balance}
		{destination}
		{destinationResolvedName}
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
			<SendDataDestination
				destination={spender}
				label={$i18n.wallet_connect.text.spender}
				resolvedName={spenderResolvedName}
			/>
		{/if}

		<WalletConnectData {data} label={$i18n.wallet_connect.text.hex_data} />
	</SendData>

	{#snippet toolbar()}
		<WalletConnectActions {onApprove} {onReject} />
	{/snippet}
</ContentWithToolbar>
