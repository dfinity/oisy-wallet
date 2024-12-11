<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import TokenMenu from '$lib/components/tokens/TokenMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { btcAddressMainnet } from '$lib/derived/address.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';

	let explorerUrl: string | undefined;
	$: explorerUrl = $token?.network.explorerUrl ?? undefined;

	let explorerAddressUrl: string | undefined;
	$: explorerAddressUrl = nonNullish(explorerUrl)
		? `${explorerUrl}/address/${$btcAddressMainnet}`
		: undefined;
</script>

<TokenMenu testId="btc-token-menu">
	{#if nonNullish(explorerAddressUrl)}
		<div in:fade>
			<ExternalLink
				fullWidth
				href={explorerAddressUrl}
				ariaLabel={$i18n.tokens.alt.open_blockstream}
				iconVisible={false}
				testId="btc-explorer-link"
			>
				{$i18n.navigation.text.view_on_explorer}
			</ExternalLink>
		</div>
	{/if}
</TokenMenu>
