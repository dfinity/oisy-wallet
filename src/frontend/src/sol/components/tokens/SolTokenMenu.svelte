<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import TokenMenu from '$lib/components/tokens/TokenMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { TOKEN_MENU_SOL, TOKEN_MENU_SOL_EXPLORER_LINK } from '$lib/constants/test-ids.constants';
	import {
		solAddressTestnet,
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLTestnet
	} from '$lib/utils/network.utils';
	import type { SolanaNetwork } from '$sol/types/network';

	let explorerUrl: string | undefined;
	$: explorerUrl = ($token?.network as SolanaNetwork)?.explorerUrl;

	$: address = isNetworkIdSOLTestnet($networkId)
		? $solAddressTestnet
		: isNetworkIdSOLDevnet($networkId)
			? $solAddressDevnet
			: isNetworkIdSOLLocal($networkId)
				? $solAddressLocal
				: $solAddressMainnet;

	let explorerAddressUrl: string | undefined;
	$: explorerAddressUrl = nonNullish(explorerUrl)
		? replacePlaceholders(explorerUrl, { $args: `account/${address}/` })
		: undefined;
</script>

<TokenMenu testId={TOKEN_MENU_SOL}>
	{#if nonNullish(explorerAddressUrl)}
		<div in:fade>
			<ExternalLink
				fullWidth
				href={explorerAddressUrl}
				ariaLabel={$i18n.tokens.alt.open_dashboard}
				iconVisible={false}
				testId={TOKEN_MENU_SOL_EXPLORER_LINK}
			>
				{$i18n.navigation.text.view_on_explorer}
			</ExternalLink>
		</div>
	{/if}
</TokenMenu>
