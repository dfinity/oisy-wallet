<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { ercFungibleTokens } from '$eth/derived/erc-fungible.derived';
	import type { EthereumNetwork } from '$eth/types/network';
	import { decodeErc20AbiData } from '$eth/utils/transactions.utils';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import SendDataSpender from '$lib/components/send/SendDataSpender.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
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
		erc20Transfer?: boolean;
		sourceNetwork: EthereumNetwork;
		targetNetwork?: Network;
		approveDisabled?: boolean;
		onApprove: () => void;
		onReject: () => void;
	}

	let {
		amount,
		destination,
		application,
		data,
		erc20Approve,
		erc20Transfer = false,
		sourceNetwork: sourceNetworkProp,
		targetNetwork,
		approveDisabled = false,
		onApprove,
		onReject
	}: Props = $props();

	let erc20 = $derived(erc20Approve || erc20Transfer);

	let decodedErc20Data = $derived.by(() => {
		if (!erc20 || isNullish(data)) {
			return;
		}

		try {
			return decodeErc20AbiData({ data });
		} catch (_: unknown) {
			// Calldata that does not decode must not be summarized: the review would
			// otherwise describe something else than what gets signed and broadcast.
		}
	});

	let spender = $derived(erc20Approve ? decodedErc20Data?.to : undefined);

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let token = $derived(
		erc20
			? $ercFungibleTokens.find(
					({ address, network: { id: networkId } }) =>
						areAddressesEqual({ address1: address, address2: destination, networkId }) &&
						networkId === sourceNetworkProp.id
				)
			: $sendToken
	);

	let amountDisplay = $derived(erc20 ? decodedErc20Data?.value : amount);

	// A transfer moves tokens to the address encoded in the calldata, not to the
	// contract the transaction is addressed to.
	let destinationDisplay = $derived(erc20Transfer ? (decodedErc20Data?.to ?? null) : destination);

	// Fail closed: without both the token and its decoded calldata, the review cannot state what
	// the user would actually approve. This covers approve as well as transfer, since an
	// undecodable approve would otherwise render as a zero-amount interaction and stay approvable.
	let unverifiableErc20 = $derived(erc20 && (isNullish(decodedErc20Data) || isNullish(token)));

	let balance = $derived(nonNullish(token) ? $balancesStore?.[token.id]?.data : undefined);
</script>

<ContentWithToolbar>
	{#if unverifiableErc20}
		<MessageBox level="warning" testId="wallet-connect-unverifiable-erc20-warning">
			{$i18n.wallet_connect.text.unverifiable_erc20_request}
		</MessageBox>
	{/if}

	<SendData
		amount={amountDisplay}
		{application}
		{balance}
		destination={destinationDisplay}
		showNullishAmountLabel={unverifiableErc20}
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
		<WalletConnectActions
			approveDisabled={approveDisabled || unverifiableErc20}
			{onApprove}
			{onReject}
		/>
	{/snippet}
</ContentWithToolbar>
