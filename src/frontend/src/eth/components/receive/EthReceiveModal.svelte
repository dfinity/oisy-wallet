<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import EthReceiveMetamask from '$eth/components/receive/EthReceiveMetamask.svelte';
	import ReceiveQRCode from '$lib/components/receive/ReceiveQRCode.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { networkAddress, networkEthereum } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.receive.text.receive}</svelte:fragment>

	<ContentWithToolbar>
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
			<EthReceiveMetamask />
		{/if}

		<button class="primary full center text-center" on:click={modalStore.close} slot="toolbar"
			>{$i18n.core.text.done}</button
		>
	</ContentWithToolbar>
</Modal>
