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
	import { networkICP } from '$lib/derived/network.derived';
	import { tokenStandard } from '$lib/derived/token.derived';
	import { modalIcpReceive, modalReceive } from '$lib/derived/modal.derived';
	import ReceiveIcpModal from '$icp/components/receive/ReceiveIcpModal.svelte';

	onMount(initMetamaskSupport);

	const isDisabled = (): boolean => $addressNotCertified || $metamaskNotInitialized;

	const openReceive = async () => {
		// $token is never undefined and per default "ethereum"
		let tokensPage = $tokenStandard === 'ethereum';

		if ($tokenStandard === 'icp' || tokensPage) {
			modalStore.openIcpReceive();
			return;
		}

		if ($networkICP) {
			modalStore.openReceive();
			return;
		}

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

{#if $modalIcpReceive}
	<ReceiveIcpModal />
{:else if $modalReceive}
	<ReceiveModal />
{/if}
