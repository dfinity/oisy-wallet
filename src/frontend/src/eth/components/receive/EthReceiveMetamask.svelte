<script lang="ts">
	import { assertNonNullish } from '@dfinity/utils';
	import { metamaskAvailable } from '$eth/derived/metamask.derived';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { openMetamaskTransaction } from '$eth/services/metamask.services';
	import IconMetamask from '$lib/components/icons/IconMetamask.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { networkEthereum } from '$lib/derived/network.derived';
	import { pageTokenStandard } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';

	const receiveModal = async () => {
		if (!$metamaskAvailable) {
			toastsError({
				msg: { text: $i18n.receive.ethereum.error.no_metamask }
			});
			return;
		}

		// This is a simple type check, since it should not happen since the user arrived here from a selected Ethereum network
		assertNonNullish($selectedEthereumNetwork);

		await openMetamaskTransaction({
			address: $ethAddress,
			network: $selectedEthereumNetwork
		});
	};

	// TODO: The Metamask button currently does not support sending ERC20 tokens - it always populates an ETH transaction.
	// We aim to fix this, but for now, the functionality is commented out.
	let tokenStandardEth = true;
	$: tokenStandardEth = $pageTokenStandard === 'ethereum';
</script>

{#if $metamaskAvailable && $networkEthereum && tokenStandardEth}
	<Button colorStyle="primary" fullWidth onclick={receiveModal} styleClass="mt-8 mb-2">
		<IconMetamask />
		<span class="text-dark-slate-blue font-bold">{$i18n.receive.ethereum.text.metamask}</span>
	</Button>
{/if}
