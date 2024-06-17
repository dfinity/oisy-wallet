<script lang="ts">
	import TokenMenu from '$lib/components/tokens/TokenMenu.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { explorerUrl as explorerUrlStore } from '$eth/derived/network.derived';
	import { address } from '$lib/derived/address.derived';
	import { tokenStandard } from '$lib/derived/token.derived';
	import type { Erc20Token } from '$eth/types/erc20';
	import { erc20TokensInitialized } from '$eth/derived/erc20.derived';
	import { fade } from 'svelte/transition';
	import { token } from '$lib/stores/token.store';

	let explorerUrl: string | undefined;
	$: explorerUrl =
		$tokenStandard === 'erc20' && nonNullish($token)
			? `${$explorerUrlStore}/token/${($token as Erc20Token).address}`
			: notEmptyString($address)
				? `${$explorerUrlStore}/address/${$address}`
				: undefined;
</script>

<TokenMenu>
	{#if nonNullish(explorerUrl) && $erc20TokensInitialized}
		<div in:fade>
			<ExternalLink
				href={explorerUrl}
				ariaLabel={$i18n.tokens.alt.open_etherscan}
				iconVisible={false}
			>
				{$i18n.navigation.text.view_on_explorer}
			</ExternalLink>
		</div>
	{/if}
</TokenMenu>
