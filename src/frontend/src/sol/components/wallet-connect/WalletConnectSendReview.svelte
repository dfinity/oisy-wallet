<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import { solAddressMainnet } from '$lib/derived/address.derived';
	import { balance } from '$lib/derived/balances.derived';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { formatToken } from '$lib/utils/format.utils';
	import WalletConnectSendData from '$sol/components/wallet-connect/WalletConnectSendData.svelte';
	import type { SolanaNetwork } from '$sol/types/network';

	export let amount: BigNumber;
	export let destination: string;
	export let data: string | undefined;
	export let network: SolanaNetwork;

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<ContentWithToolbar>
	{#if nonNullish($sendToken)}
		<!-- TODO: add address for devnet and testnet-->
		<SendData
			amount={formatToken({ value: amount })}
			{destination}
			token={$sendToken}
			balance={$balance}
			source={$solAddressMainnet ?? ''}
		>
			<WalletConnectSendData {data} />

			<!-- TODO: add checks for insufficient funds for fee, when we calculate the fee-->

			<ReviewNetwork sourceNetwork={network} slot="network" />
		</SendData>
	{/if}

	<WalletConnectActions on:icApprove on:icReject slot="toolbar" />
</ContentWithToolbar>
