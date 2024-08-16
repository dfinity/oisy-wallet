<script lang="ts">
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { explorerUrl as explorerUrlStore } from '$eth/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';

	let explorerUrl: string | undefined = notEmptyString($ethAddress)
		? `${$explorerUrlStore}/address/${$ethAddress}`
		: undefined;
</script>

<div>
	<label class="block text-sm font-bold" for="eth-wallet-address"
		>{$i18n.wallet.text.wallet_address}:</label
	>

	<output class="break-all" id="eth-wallet-address"
		>{shortenWithMiddleEllipsis($ethAddress ?? '')}</output
	><Copy inline color="inherit" value={$ethAddress ?? ''} text={$i18n.wallet.text.address_copied} />
</div>

{#if nonNullish(explorerUrl)}
	<ExternalLink href={explorerUrl} ariaLabel={$i18n.wallet.alt.open_etherscan}>
		{$i18n.navigation.text.view_on_explorer}
	</ExternalLink>
{/if}
