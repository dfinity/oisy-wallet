<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { CAIP10_CHAINS } from '$env/caip10-chains.env';
	import type { WalletConnectEthSendTransactionParams } from '$eth/types/wallet-connect';
	import { modalWalletConnectSend } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import WalletConnectSendModal from '$sol/components/wallet-connect/WalletConnectSendModal.svelte';
	import { enabledSolanaNetworks } from '$sol/derived/networks.derived';
	import type { SolanaNetwork } from '$sol/types/network';

	export let listener: OptionWalletConnectListener;

	let request: Web3WalletTypes.SessionRequest | undefined;
	$: request = $modalWalletConnectSend
		? ($modalStore?.data as Web3WalletTypes.SessionRequest | undefined)
		: undefined;

	let firstTransaction: WalletConnectEthSendTransactionParams | undefined;
	$: firstTransaction = request?.params.request.params?.[0];

	let chainId: string | undefined;
	$: chainId = nonNullish(request?.params.chainId)
		? CAIP10_CHAINS[request.params.chainId]?.chainId
		: undefined;

	let network: SolanaNetwork | undefined;
	$: network = nonNullish(chainId)
		? $enabledSolanaNetworks.find(({ chainId: cId }) => cId === chainId)
		: undefined;
</script>

{#if $modalWalletConnectSend && nonNullish(request) && nonNullish(firstTransaction) && nonNullish(network)}
	<WalletConnectSendModal {request} {firstTransaction} {network} bind:listener />
{/if}
