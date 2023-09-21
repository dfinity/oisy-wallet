<script lang="ts">
	import { formatTokenShort } from '$lib/utils/format.utils';
	import SendData from '$lib/components/send/SendData.svelte';
	import type { BigNumber } from '@ethersproject/bignumber';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import { decodeErc20AbiDataValue } from '$lib/utils/transactions.utils';
	import { nonNullish } from '@dfinity/utils';
	import WalletConnectSendData from '$lib/components/wallet-connect/WalletConnectSendData.svelte';
	import { ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';

	export let amount: BigNumber;
	export let destination: string;
	export let data: string | undefined;
	export let erc20Approve: boolean;

	let amountDisplay: BigNumber;
	$: amountDisplay = erc20Approve && nonNullish(data) ? decodeErc20AbiDataValue(data) : amount;
</script>

<SendData amount={formatTokenShort({ value: amountDisplay })} {destination} token={ETHEREUM_TOKEN}>
	<WalletConnectSendData {data} />
</SendData>

<WalletConnectActions on:icApprove on:icReject />
