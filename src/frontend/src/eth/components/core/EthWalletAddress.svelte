<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { getExplorerUrl } from '$eth/utils/eth.utils';
	import { selectedEvmNetwork } from '$evm/derived/network.derived';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	let explorerUrl: string | undefined = $derived(
		notEmptyString($ethAddress)
			? `${getExplorerUrl({
					network: nonNullish($selectedEvmNetwork) ? $selectedEvmNetwork : $selectedEthereumNetwork
				})}/address/${$ethAddress}`
			: undefined
	);
</script>

<div class="p-3">
	<label class="block text-sm font-bold" for="eth-wallet-address"
		>{$i18n.wallet.text.wallet_address}:</label
	>

	<output id="eth-wallet-address" class="break-all"
		>{shortenWithMiddleEllipsis({ text: $ethAddress ?? '' })}</output
	><Copy inline text={$i18n.wallet.text.address_copied} value={$ethAddress ?? ''} />
</div>

{#if nonNullish(explorerUrl)}
	<ExternalLink ariaLabel={$i18n.wallet.alt.open_etherscan} asMenuItem href={explorerUrl}>
		{$i18n.navigation.text.view_on_explorer}
	</ExternalLink>
{/if}
