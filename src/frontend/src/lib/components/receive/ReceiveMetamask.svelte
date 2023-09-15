<script lang="ts">
	import { openMetamaskTransaction } from '$lib/services/metamask.services';
	import { metamaskAvailable } from '$lib/derived/metamask.derived';
	import { addressStore } from '$lib/stores/address.store';
	import IconMetamask from '$lib/components/icons/IconMetamask.svelte';
	import { toastsError } from '$lib/stores/toasts.store';

	const receiveModal = async () => {
		if (!$metamaskAvailable) {
			toastsError({
				msg: { text: `Metamask is not available.` }
			});
			return;
		}

		await openMetamaskTransaction($addressStore);
	};
</script>

{#if $metamaskAvailable}
	<button class="secondary full center my-4" on:click={receiveModal}>
		<IconMetamask />
		<span class="text-dark-slate-blue font-bold">Receive from Metamask</span>
	</button>
{/if}
