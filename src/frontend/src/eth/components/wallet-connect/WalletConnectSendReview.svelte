<script lang="ts">
	import { formatToken } from '$lib/utils/format.utils';
	import SendData from '$lib/components/send/SendData.svelte';
	import type { BigNumber } from '@ethersproject/bignumber';
	import WalletConnectActions from './WalletConnectActions.svelte';
	import { decodeErc20AbiDataValue } from '$eth/utils/transactions.utils';
	import { nonNullish } from '@dfinity/utils';
	import WalletConnectSendData from './WalletConnectSendData.svelte';
	import { address } from '$lib/derived/address.derived';
	import FeeDisplay from '$eth/components/fee/FeeDisplay.svelte';
	import type { Network } from '$lib/types/network';
	import SendReviewNetwork from '$eth/components/send/SendReviewNetwork.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { ethToken } from '$eth/derived/eth.derived';

	export let amount: BigNumber;
	export let destination: string;
	export let data: string | undefined;
	export let erc20Approve: boolean;
	export let targetNetwork: Network | undefined = undefined;

	let amountDisplay: BigNumber;
	$: amountDisplay = erc20Approve && nonNullish(data) ? decodeErc20AbiDataValue(data) : amount;
</script>

<SendData
	amount={formatToken({ value: amountDisplay })}
	{destination}
	token={$ethToken}
	balance={$balance}
	source={$address ?? ''}
>
	<WalletConnectSendData {data} />

	<FeeDisplay slot="fee" />

	<SendReviewNetwork {targetNetwork} slot="network" />
</SendData>

<WalletConnectActions on:icApprove on:icReject />
