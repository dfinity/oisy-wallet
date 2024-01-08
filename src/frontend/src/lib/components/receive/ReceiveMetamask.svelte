<script lang="ts">
	import { openMetamaskTransaction } from '../../../eth/services/metamask.services';
	import { metamaskAvailable } from '../../../eth/derived/metamask.derived';
	import { address } from '$lib/derived/address.derived';
	import IconMetamask from '$lib/components/icons/IconMetamask.svelte';
	import { toastsError } from '$lib/stores/toasts.store';
	import { networkEthereum } from '$lib/derived/network.derived';

	const receiveModal = async () => {
		if (!$metamaskAvailable) {
			toastsError({
				msg: { text: `Metamask is not available.` }
			});
			return;
		}

		await openMetamaskTransaction($address);
	};
</script>

{#if $metamaskAvailable && $networkEthereum}
	<button class="secondary full center my-4" on:click={receiveModal}>
		<IconMetamask />
		<span class="text-dark-slate-blue font-bold">Receive from Metamask</span>
	</button>
{/if}
