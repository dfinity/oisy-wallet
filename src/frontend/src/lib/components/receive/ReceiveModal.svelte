<script lang="ts">
	import { modalReceive } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { addressStore } from '$lib/stores/address.store';
	import ReceiveQRCode from '$lib/components/receive/ReceiveQRCode.svelte';
	import { Modal } from '@dfinity/gix-components';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import ReceiveMetamask from '$lib/components/receive/ReceiveMetamask.svelte';
</script>

<Modal visible={$modalReceive} on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">Receive ETH</svelte:fragment>

	<p class="font-bold text-center">Wallet address:</p>
	<p class="flex gap-1 mb-2 font-normal sm:items-center justify-center">
		<output class="break-words">{shortenWithMiddleEllipsis($addressStore ?? '')}</output><Copy
			value={$addressStore ?? ''}
		/>
	</p>

	<ReceiveQRCode />

	<ReceiveMetamask />

	<button
		class="primary flex justify-center text-center mt-6 mb-3"
		style="width: 100%"
		on:click={modalStore.close}>Done</button
	>
</Modal>
