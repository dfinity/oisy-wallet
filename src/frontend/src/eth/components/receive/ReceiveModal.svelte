<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import ReceiveQRCode from '$lib/components/receive/ReceiveQRCode.svelte';
	import { Modal } from '@dfinity/gix-components';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { networkAddress, networkEthereum } from '$lib/derived/network.derived';
	import ReceiveMetamask from '$eth/components/receive/ReceiveMetamask.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.receive.text.receive}</svelte:fragment>

	<div class="stretch">
		<p class="font-bold text-center">Address:</p>
		<p class="mb-4 font-normal text-center px-2 max-w-xs mx-auto">
			<output class="break-all">{$networkAddress ?? ''}</output><Copy
				inline
				value={$networkAddress ?? ''}
				text={$i18n.wallet.text.address_copied}
			/>
		</p>

		<ReceiveQRCode address={$networkAddress ?? ''} />

		{#if $networkEthereum}
			<ReceiveMetamask />
		{/if}
	</div>

	<button class="primary full center text-center" on:click={modalStore.close}
		>{$i18n.core.text.done}</button
	>
</Modal>
