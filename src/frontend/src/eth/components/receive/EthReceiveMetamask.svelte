<script lang="ts">
	import { metamaskAvailable } from '$eth/derived/metamask.derived';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { openMetamaskTransaction } from '$eth/services/metamask.services';
	import IconMetamask from '$lib/components/icons/IconMetamask.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';

	const receiveModal = async () => {
		if (!$metamaskAvailable) {
			toastsError({
				msg: { text: $i18n.receive.ethereum.error.no_metamask }
			});
			return;
		}

		await openMetamaskTransaction({
			address: $ethAddress,
			network: $selectedEthereumNetwork
		});
	};
</script>

{#if $metamaskAvailable}
	<button class="secondary-alt full center my-4" on:click={receiveModal}>
		<IconMetamask />
		<span class="text-dark-slate-blue font-bold">{$i18n.receive.ethereum.text.metamask}</span>
	</button>
{/if}
