<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { explorerUrl as explorerUrlStore } from '$eth/derived/network.derived';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	let explorerUrl: string | undefined = notEmptyString($ethAddress)
		? `${$explorerUrlStore}/address/${$ethAddress}`
		: undefined;
</script>

<div class="p-3">
	<label class="text-sm font-bold block" for="eth-wallet-address"
		>{$i18n.wallet.text.wallet_address}:</label
	>

	<output class="break-all" id="eth-wallet-address"
		>{shortenWithMiddleEllipsis({ text: $ethAddress ?? '' })}</output
	><Copy inline color="inherit" value={$ethAddress ?? ''} text={$i18n.wallet.text.address_copied} />
</div>

{#if nonNullish(explorerUrl)}
	<ExternalLink href={explorerUrl} ariaLabel={$i18n.wallet.alt.open_etherscan}>
		{$i18n.navigation.text.view_on_explorer}
	</ExternalLink>
{/if}
