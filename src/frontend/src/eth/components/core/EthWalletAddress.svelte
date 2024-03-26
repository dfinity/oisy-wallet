<script lang="ts">
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { address } from '$lib/derived/address.derived';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { nonNullish } from '@dfinity/utils';
	import { notEmptyString } from '@dfinity/utils';
	import { explorerUrl as explorerUrlStore } from '$eth/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';

	let explorerUrl: string | undefined = notEmptyString($address)
		? `${$explorerUrlStore}/address/${$address}`
		: undefined;
</script>

<div>
	<label class="block text-sm font-bold" for="eth-wallet-address">{$i18n.wallet.address}:</label>

	<output class="break-all" id="eth-wallet-address"
		>{shortenWithMiddleEllipsis($address ?? '')}</output
	><Copy inline color="inherit" value={$address ?? ''} text={$i18n.wallet.address_copied} />
</div>

{#if nonNullish(explorerUrl)}
	<ExternalLink href={explorerUrl} ariaLabel={$i18n.wallet.alt_open_etherscan}>
		{$i18n.navigation.text.view_on_explorer}
	</ExternalLink>
{/if}
