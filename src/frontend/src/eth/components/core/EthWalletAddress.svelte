<script lang="ts">
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { address } from '$lib/derived/address.derived';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { ETHEREUM_EXPLORER_URL } from '$lib/constants/explorers.constants';
	import { nonNullish } from '@dfinity/utils';
	import { notEmptyString } from '@dfinity/utils';

	let explorerUrl: string | undefined =
		notEmptyString(ETHEREUM_EXPLORER_URL) && notEmptyString($address)
			? `${ETHEREUM_EXPLORER_URL}/address/${$address}`
			: undefined;
</script>

<div>
	<label class="block text-sm font-bold" for="eth-wallet-address">Wallet address:</label>

	<output class="break-all" id="eth-wallet-address"
		>{shortenWithMiddleEllipsis($address ?? '')}</output
	><Copy inline color="inherit" value={$address ?? ''} text="Address copied to clipboard." />
</div>

{#if nonNullish(explorerUrl)}
	<ExternalLink href={explorerUrl} ariaLabel="Open your address on Etherscan">
		View on explorer
	</ExternalLink>
{/if}
