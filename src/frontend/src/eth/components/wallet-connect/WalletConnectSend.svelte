<script lang="ts">
	import { modalWalletConnectSend } from '$lib/derived/modal.derived';
	import type { WalletConnectEthSendTransactionParams } from '$eth/types/wallet-connect';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { modalStore } from '$lib/stores/modal.store';
	import { nonNullish } from '@dfinity/utils';
	import WalletConnectSendModal from './WalletConnectSendModal.svelte';
	import type { WalletConnectListener } from '$eth/types/wallet-connect';
	import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
	import type { EthereumNetwork } from '$eth/types/network';
	import { EIP155_CHAINS } from '$env/eip155-chains.env';

	export let listener: WalletConnectListener | undefined | null;

	let request: Web3WalletTypes.SessionRequest | undefined;
	$: request = $modalWalletConnectSend
		? ($modalStore?.data as Web3WalletTypes.SessionRequest | undefined)
		: undefined;

	let firstTransaction: WalletConnectEthSendTransactionParams | undefined;
	$: firstTransaction = request?.params.request.params?.[0];

	let chainId: number | undefined;
	$: chainId = nonNullish(request?.params.chainId)
		? EIP155_CHAINS[request.params.chainId]?.chainId
		: undefined;

	let sourceNetwork: EthereumNetwork | undefined;
	$: sourceNetwork = nonNullish(chainId)
		? $enabledEthereumNetworks.find(({ chainId: cId }) => cId === BigInt(chainId))
		: undefined;
</script>

{#if $modalWalletConnectSend && nonNullish(request) && nonNullish(firstTransaction) && nonNullish(sourceNetwork)}
	<WalletConnectSendModal {request} {firstTransaction} {sourceNetwork} bind:listener />
{/if}
