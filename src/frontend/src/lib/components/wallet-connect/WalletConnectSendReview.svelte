<script lang="ts">
	import { formatEtherShort } from '$lib/utils/format.utils';
	import SendData from '$lib/components/send/SendData.svelte';
	import type { BigNumber } from '@ethersproject/bignumber';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import { decodeErc20AbiDataValue } from '$lib/utils/transactions.utils';

	export let amount: BigNumber;
	export let destination: string;
	export let data: string;
	export let transactionApprove: boolean;

	let amountDisplay: BigNumber;
	$: amountDisplay = transactionApprove ? decodeErc20AbiDataValue(data) : amount;
</script>

<SendData amount={formatEtherShort(amountDisplay)} {destination} />

<WalletConnectActions on:icApprove on:icReject />
