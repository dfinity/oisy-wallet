<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import SendReviewNetwork from '$eth/components/send/SendReviewNetwork.svelte';
	import type { EthereumNetwork } from '$eth/types/network';
	import { decodeErc20AbiDataValue } from '$eth/utils/transactions.utils';
	import SendData from '$lib/components/send/SendData.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectData from '$lib/components/wallet-connect/WalletConnectData.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { balance } from '$lib/derived/balances.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Network } from '$lib/types/network';
	import { formatToken } from '$lib/utils/format.utils';

	export let amount: bigint;
	export let destination: string;
	export let data: string | undefined;
	export let erc20Approve: boolean;
	export let sourceNetwork: EthereumNetwork;
	export let targetNetwork: Network | undefined = undefined;

	let amountDisplay: bigint;
	$: amountDisplay = erc20Approve && nonNullish(data) ? decodeErc20AbiDataValue({ data }) : amount;

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<ContentWithToolbar>
	<SendData
		amount={formatToken({ value: amountDisplay })}
		{destination}
		token={$sendToken}
		balance={$balance}
		source={$ethAddress ?? ''}
	>
		<WalletConnectData {data} label={$i18n.wallet_connect.text.hex_data} />

		<EthFeeDisplay slot="fee" />

		<SendReviewNetwork {sourceNetwork} {targetNetwork} token={$sendToken} slot="network" />
	</SendData>

	{#snippet toolbar()}
		<WalletConnectActions on:icApprove on:icReject />
	{/snippet}
</ContentWithToolbar>
