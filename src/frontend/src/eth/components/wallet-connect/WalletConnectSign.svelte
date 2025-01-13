<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import WalletConnectSignModal from '$eth/components/wallet-connect/WalletConnectSignModal.svelte';
	import { modalWalletConnectSign } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';

	export let listener: OptionWalletConnectListener;

	let request: Web3WalletTypes.SessionRequest | undefined;
	$: request = $modalWalletConnectSign
		? ($modalStore?.data as Web3WalletTypes.SessionRequest | undefined)
		: undefined;
</script>

{#if $modalWalletConnectSign && nonNullish(request)}
	<WalletConnectSignModal {request} bind:listener />
{/if}
