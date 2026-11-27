<script lang="ts">
	import { metamaskAvailable } from '$eth/derived/metamask.derived';
	import { openMetamaskTransaction } from '$eth/services/metamask.services';
	import type { EthAddress } from '$eth/types/address';
	import type { EthereumNetwork } from '$eth/types/network';
	import IconMetamask from '$lib/components/icons/IconMetamask.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';

	interface Props {
		// The network of the Receive route and the address resolved for it.
		network: EthereumNetwork;
		address: EthAddress;
	}

	let { network, address }: Props = $props();

	const receiveModal = async () => {
		if (!$metamaskAvailable) {
			toastsError({
				msg: { text: $i18n.receive.ethereum.error.no_metamask }
			});
			return;
		}

		await openMetamaskTransaction({
			address,
			network
		});
	};
</script>

<!-- The Metamask handoff always populates an ETH transaction, so it is offered for native ETH only. -->
{#if $metamaskAvailable}
	<Button colorStyle="primary" fullWidth onclick={receiveModal} styleClass="mt-4 mb-2">
		<IconMetamask />
		<span class="text-dark-slate-blue font-bold">{$i18n.receive.ethereum.text.metamask}</span>
	</Button>
{/if}
