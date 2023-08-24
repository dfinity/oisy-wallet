<script lang="ts">
	import { modalStore, modalWalletConnectSign } from '$lib/stores/modal.store';
	import { Modal } from '@dfinity/gix-components';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { nonNullish } from '@dfinity/utils';
	import { getSignParamsMessage } from '$lib/utils/wallet-connect.utils';

	let request: Web3WalletTypes.SessionRequest | undefined;
	$: request = $modalStore?.data as Web3WalletTypes.SessionRequest | undefined;
</script>

{#if $modalWalletConnectSign && nonNullish(request)}
	<Modal on:nnsClose={modalStore.close}>
		<svelte:fragment slot="title">Sign Message</svelte:fragment>

		<p class="font-bold">Message</p>
		<p class="mb-2 font-normal">
			<output class="break-words">{getSignParamsMessage(request.params.request.params)}</output>
		</p>

		<p class="font-bold">Method</p>
		<p class="mb-2 font-normal">
			{request.params.request.method}
		</p>
	</Modal>
{/if}
