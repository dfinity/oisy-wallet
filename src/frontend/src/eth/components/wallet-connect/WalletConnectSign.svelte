<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import WalletConnectSignModal from '$eth/components/wallet-connect/WalletConnectSignModal.svelte';
	import { modalWalletConnectSign } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import { mapChainIdToNetwork } from '$lib/utils/wallet-connect.utils';
	import WalletConnectSignSolModal from '$sol/components/wallet-connect/WalletConnectSignSolModal.svelte';

	export let listener: OptionWalletConnectListener;

	let request: Web3WalletTypes.SessionRequest | undefined;
	$: request = $modalWalletConnectSign
		? ($modalStore?.data as Web3WalletTypes.SessionRequest | undefined)
		: undefined;

	let requestNetwork;
	$: requestNetwork = nonNullish(request) && mapChainIdToNetwork(request.params.chainId);
</script>

{#if $modalWalletConnectSign && nonNullish(request)}
	{#if requestNetwork === 'ethereum'}
		<WalletConnectSignModal {request} bind:listener />
	{:else if requestNetwork === 'solana'}
		<WalletConnectSignSolModal {request} bind:listener />
	{/if}
{/if}
