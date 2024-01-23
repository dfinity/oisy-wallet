<script lang="ts">
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotCertified } from '$lib/derived/address.derived';
	import ReceiveModal from '$lib/components/receive/ReceiveModal.svelte';
	import { metamaskNotInitialized } from '$eth/derived/metamask.derived';
	import { onMount } from 'svelte';
	import { initMetamaskSupport } from '$eth/services/metamask.services';
	import { busy } from '$lib/stores/busy.store';
	import { toastsShow } from '$lib/stores/toasts.store';
	import { isBusy } from '$lib/derived/busy.derived';

	onMount(initMetamaskSupport);

	const isDisabled = (): boolean => $addressNotCertified || $metamaskNotInitialized;

	const waitReady = async (count: number): Promise<'ready' | 'timeout'> => {
		const disabled = isDisabled();

		if (!disabled) {
			return 'ready';
		}

		let nextCount = count - 1;

		if (nextCount === 0) {
			return 'timeout';
		}

		await new Promise((resolve) => setTimeout(resolve, 500));

		return waitReady(nextCount);
	};

	const openReceive = async () => {
		if (isDisabled()) {
			busy.start({ msg: 'Loading initial data...' });

			// 20 tries with a delay of 500ms each = max 10 seconds
			const result = await waitReady(20);

			busy.stop();

			if (result === 'timeout') {
				toastsShow({
					text: 'Your wallet requires some initial data which has not been loaded yet. Please try again.',
					level: 'info',
					duration: 3000
				});
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
