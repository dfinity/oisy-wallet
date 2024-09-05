<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import WalletConnectSignModal from './WalletConnectSignModal.svelte';
	import type { WalletConnectListener } from '$eth/types/wallet-connect';
	import { modalWalletConnectSign } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	export let listener: WalletConnectListener | undefined | null;

	let request: Web3WalletTypes.SessionRequest | undefined;
	$: request = $modalWalletConnectSign
		? ($modalStore?.data as Web3WalletTypes.SessionRequest | undefined)
		: undefined;
</script>

{#if $modalWalletConnectSign && nonNullish(request)}
	<WalletConnectSignModal {request} bind:listener />
{/if}
