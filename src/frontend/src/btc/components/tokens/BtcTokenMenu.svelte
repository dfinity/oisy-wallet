<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { explorerUrl as explorerUrlStore } from '$btc/derived/network.derived';
	import TokenMenu from '$lib/components/tokens/TokenMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { btcAddressMainnet } from '$lib/derived/address.derived';
	import { i18n } from '$lib/stores/i18n.store';

	let explorerUrl: string | undefined;
	$: explorerUrl = notEmptyString($btcAddressMainnet)
		? `${$explorerUrlStore}/address/${$btcAddressMainnet}`
		: undefined;
</script>

<TokenMenu>
	{#if nonNullish(explorerUrl)}
		<div in:fade>
			<ExternalLink
				fullWidth
				href={explorerUrl}
				ariaLabel={$i18n.tokens.alt.open_blockstream}
				iconVisible={false}
			>
				{$i18n.navigation.text.view_on_explorer}
			</ExternalLink>
		</div>
	{/if}
</TokenMenu>
