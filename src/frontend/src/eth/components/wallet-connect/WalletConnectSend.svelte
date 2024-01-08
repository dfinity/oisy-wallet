<script lang="ts">
	import { modalWalletConnectSend } from '$lib/derived/modal.derived';
	import type { WalletConnectEthSendTransactionParams } from '$lib/types/wallet-connect';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { modalStore } from '$lib/stores/modal.store';
	import { nonNullish } from '@dfinity/utils';
	import WalletConnectSendModal from './WalletConnectSendModal.svelte';
	import type { WalletConnectListener } from '$lib/types/wallet-connect';

	export let listener: WalletConnectListener | undefined | null;

	let request: Web3WalletTypes.SessionRequest | undefined;
	$: request = $modalWalletConnectSend
		? ($modalStore?.data as Web3WalletTypes.SessionRequest | undefined)
		: undefined;

	let firstTransaction: WalletConnectEthSendTransactionParams | undefined;
	$: firstTransaction = request?.params.request.params?.[0];
</script>

{#if $modalWalletConnectSend && nonNullish(request) && nonNullish(firstTransaction)}
	<WalletConnectSendModal {request} {firstTransaction} bind:listener />
{/if}
