<script lang="ts">
	import { openMetamaskTransaction } from '$eth/services/metamask.services';
	import { metamaskAvailable } from '$eth/derived/metamask.derived';
	import { address } from '$lib/derived/address.derived';
	import IconMetamask from '$lib/components/icons/IconMetamask.svelte';
	import { toastsError } from '$lib/stores/toasts.store';
	import { networkEthereum } from '$lib/derived/network.derived';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';

	const receiveModal = async () => {
		if (!$metamaskAvailable) {
			toastsError({
				msg: { text: $i18n.receive.ethereum.error.no_metamask }
			});
			return;
		}

		await openMetamaskTransaction({
			address: $address,
			network: $selectedEthereumNetwork
		});
	};
</script>

{#if $metamaskAvailable && $networkEthereum}
	<button class="secondary full center my-4" on:click={receiveModal}>
		<IconMetamask />
		<span class="text-dark-slate-blue font-bold">{$i18n.receive.ethereum.text.metamask}</span>
	</button>
{/if}
