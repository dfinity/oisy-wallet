<script lang="ts">
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotCertified } from '$lib/derived/address.derived';
	import ReceiveModal from '$lib/components/receive/ReceiveModal.svelte';
	import { metamaskNotInitialized } from '$eth/derived/metamask.derived';
	import { onMount } from 'svelte';
	import { initMetamaskSupport } from '$eth/services/metamask.services';
	import { isBusy } from '$lib/derived/busy.derived';
	import { waitWalletReady } from '$lib/services/actions.services';

	onMount(initMetamaskSupport);

	const isDisabled = (): boolean => $addressNotCertified || $metamaskNotInitialized;

	const openReceive = async () => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		modalStore.openReceive();
	};
</script>

<button
	class="flex-1 hero"
	disabled={$isBusy}
	class:opacity-50={$isBusy}
	on:click={async () => await openReceive()}
>
	<IconReceive size="28" />
	<span>Receive</span></button
>

<ReceiveModal />
