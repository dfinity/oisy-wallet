<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { run } from 'svelte/legacy';
	import {
		SOLANA_DEVNET_NETWORK,
		SOLANA_LOCAL_NETWORK,
		SOLANA_MAINNET_NETWORK
	} from '$env/networks/networks.sol.env';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionSolAddress } from '$lib/types/address';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
	import type { SolanaNetwork } from '$sol/types/network';

	let address: OptionSolAddress = $state();
	let network: SolanaNetwork = $state();
	run(() => {
		[address, network] = isNetworkIdSOLDevnet($networkId)
			? [$solAddressDevnet, SOLANA_DEVNET_NETWORK]
			: isNetworkIdSOLLocal($networkId)
				? [$solAddressLocal, SOLANA_LOCAL_NETWORK]
				: [$solAddressMainnet, SOLANA_MAINNET_NETWORK];
	});

	let explorerUrl: string | undefined = $state();
	run(() => {
		({ explorerUrl } = network);
	});

	let explorerAddressUrl: string | undefined = $derived(
		nonNullish(explorerUrl)
			? replacePlaceholders(explorerUrl, { $args: `account/${address}/` })
			: undefined
	);
</script>

<div class="p-3">
	<label class="block text-sm font-bold" for="eth-wallet-address"
		>{$i18n.wallet.text.wallet_address}:</label
	>

	<output id="eth-wallet-address" class="break-all"
		>{shortenWithMiddleEllipsis({ text: address ?? '' })}</output
	><Copy inline text={$i18n.wallet.text.address_copied} value={address ?? ''} />
</div>

{#if nonNullish(explorerAddressUrl)}
	<ExternalLink ariaLabel={$i18n.wallet.alt.open_solscan} asMenuItem href={explorerAddressUrl}>
		{$i18n.navigation.text.view_on_explorer}
	</ExternalLink>
{/if}
