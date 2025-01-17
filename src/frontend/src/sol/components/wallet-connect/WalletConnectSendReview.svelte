<script lang="ts">
	import type { BigNumber } from '@ethersproject/bignumber';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import { solAddressMainnet } from '$lib/derived/address.derived';
	import { balance } from '$lib/derived/balances.derived';
	import type { Token } from '$lib/types/token';
	import WalletConnectSendData from '$sol/components/wallet-connect/WalletConnectSendData.svelte';
	import type { SolanaNetwork } from '$sol/types/network';

	export let amount: BigNumber;
	export let destination: string;
	export let data: string | undefined;
	export let token: Token;

	let network: SolanaNetwork;
	$: ({ network } = token);

	$: amount, console.log('amount', amount);
</script>

<ContentWithToolbar>
	<!-- TODO: add address for devnet and testnet-->
	<SendData
		amount={amount.toString()}
		{destination}
		{token}
		balance={$balance}
		source={$solAddressMainnet ?? ''}
	>
		<WalletConnectSendData {data} />

		<!-- TODO: add checks for insufficient funds for fee, when we calculate the fee-->

		<ReviewNetwork sourceNetwork={network} slot="network" />
	</SendData>

	<WalletConnectActions on:icApprove on:icReject slot="toolbar" />
</ContentWithToolbar>
