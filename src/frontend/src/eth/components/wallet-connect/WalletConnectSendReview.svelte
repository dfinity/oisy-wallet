<script lang="ts">
	import { formatToken } from '$lib/utils/format.utils';
	import SendData from '$lib/components/send/SendData.svelte';
	import type { BigNumber } from '@ethersproject/bignumber';
	import WalletConnectActions from './WalletConnectActions.svelte';
	import { nonNullish } from '@dfinity/utils';
	import WalletConnectSendData from './WalletConnectSendData.svelte';
	import { address } from '$lib/derived/address.derived';
	import FeeDisplay from '$eth/components/fee/FeeDisplay.svelte';
	import type { Network } from '$lib/types/network';
	import SendReviewNetwork from '$eth/components/send/SendReviewNetwork.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import type { EthereumNetwork } from '$eth/types/network';
	import { getContext } from 'svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';

	import { decodeErc20AbiDataValue } from '$eth/utils/transactions.utils';

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

<SendData
	amount={formatToken({ value: amountDisplay })}
	{destination}
	token={$sendToken}
	balance={$balance}
	source={$address ?? ''}
>
	<WalletConnectSendData {data} />

	<FeeDisplay slot="fee" />

	<SendReviewNetwork {sourceNetwork} {targetNetwork} token={$sendToken} slot="network" />
</SendData>

<WalletConnectActions on:icApprove on:icReject />
