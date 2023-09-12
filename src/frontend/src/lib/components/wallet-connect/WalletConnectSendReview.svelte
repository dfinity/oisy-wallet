<script lang="ts">
	import { formatEtherShort } from '$lib/utils/format.utils';
	import SendData from '$lib/components/send/SendData.svelte';
	import type { BigNumber } from '@ethersproject/bignumber';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';

	export let amount: BigNumber;
	export let destination: string;
</script>

<SendData amount={formatEtherShort(amount)} {destination} />

<WalletConnectActions on:icApprove on:icReject />
