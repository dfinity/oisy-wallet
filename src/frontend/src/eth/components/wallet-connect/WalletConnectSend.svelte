<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { CAIP10_CHAINS } from '$env/caip10-chains.env';
	import { EIP155_CHAINS } from '$env/eip155-chains.env';
	import WalletConnectSendModal from '$eth/components/wallet-connect/WalletConnectSendModal.svelte';
	import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { WalletConnectEthSendTransactionParams } from '$eth/types/wallet-connect';
	import { modalWalletConnectSend } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import SolWalletConnectSendModal from '$sol/components/wallet-connect/WalletConnectSendModal.svelte';
	import { enabledSolanaNetworks } from '$sol/derived/networks.derived';
	import type { SolanaNetwork } from '$sol/types/network';

	export let listener: OptionWalletConnectListener;

	let request: Web3WalletTypes.SessionRequest | undefined;
	$: request = $modalWalletConnectSend
		? ($modalStore?.data as Web3WalletTypes.SessionRequest | undefined)
		: undefined;

	let firstTransaction: WalletConnectEthSendTransactionParams | undefined;
	$: firstTransaction = request?.params.request.params?.[0];

	let ethChainId: number | undefined;
	$: ethChainId = nonNullish(request?.params.chainId)
		? EIP155_CHAINS[request.params.chainId]?.chainId
		: undefined;

	let solChainId: string | undefined;
	$: solChainId = nonNullish(request?.params.chainId)
		? CAIP10_CHAINS[request.params.chainId]?.chainId
		: undefined;

	let sourceEthNetwork: EthereumNetwork | undefined;
	$: sourceEthNetwork = nonNullish(ethChainId)
		? $enabledEthereumNetworks.find(({ chainId: cId }) => cId === BigInt(ethChainId))
		: undefined;

	let sourceSolNetwork: SolanaNetwork | undefined;
	$: sourceSolNetwork = nonNullish(solChainId)
		? $enabledSolanaNetworks.find(({ chainId: cId }) => cId === solChainId)
		: undefined;
</script>

{#if $modalWalletConnectSend && nonNullish(request) && nonNullish(firstTransaction)}
	{#if nonNullish(sourceEthNetwork)}
		<WalletConnectSendModal
			{request}
			{firstTransaction}
			sourceNetwork={sourceEthNetwork}
			bind:listener
		/>
	{:else if nonNullish(sourceSolNetwork)}
		<SolWalletConnectSendModal
			{request}
			{firstTransaction}
			network={sourceSolNetwork}
			bind:listener
		/>
	{/if}
{/if}
