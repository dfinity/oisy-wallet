<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import FeeDisplay from '$eth/components/fee/FeeDisplay.svelte';
	import SendReviewNetwork from '$eth/components/send/SendReviewNetwork.svelte';
	import WalletConnectSendData from '$eth/components/wallet-connect/WalletConnectSendData.svelte';
	import type { EthereumNetwork } from '$eth/types/network';
	import { decodeErc20AbiDataValue } from '$eth/utils/transactions.utils';
	import SendData from '$lib/components/send/SendData.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { balance } from '$lib/derived/balances.derived';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Network } from '$lib/types/network';
	import { formatToken } from '$lib/utils/format.utils';

	export let amount: BigNumber;
	export let destination: string;
	export let data: string | undefined;
	export let erc20Approve: boolean;
	export let sourceNetwork: EthereumNetwork;
	export let targetNetwork: Network | undefined = undefined;

	let amountDisplay: BigNumber;
	$: amountDisplay = erc20Approve && nonNullish(data) ? decodeErc20AbiDataValue(data) : amount;

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
		<WalletConnectSendData {data} />

		<FeeDisplay slot="fee" />

		<SendReviewNetwork {sourceNetwork} {targetNetwork} token={$sendToken} slot="network" />
	</SendData>

	<WalletConnectActions on:icApprove on:icReject slot="toolbar" />
</ContentWithToolbar>
