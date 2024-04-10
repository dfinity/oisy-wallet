<script lang="ts">
	import TokenMenu from '$lib/components/tokens/TokenMenu.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { nonNullish } from '@dfinity/utils';
	import { token } from '$lib/derived/token.derived';
	import { fade } from 'svelte/transition';
	import { tokenCkBtcLedger, tokenCkEthLedger } from '$icp/derived/ic-token.derived';
	import { isNetworkIdBTCMainnet, isNetworkIdETHMainnet } from '$icp/utils/ic-send.utils';
	import type { IcCkToken } from '$icp/types/ic';
	import { CKBTC_EXPLORER_URL, CKETH_EXPLORER_URL, ICP_EXPLORER_URL } from '$env/explorers.env';

	// TODO: we can derive mainnet, ckBTC and ckETH code to avoid duplication
	let mainnet = false;
	$: mainnet =
		isNetworkIdBTCMainnet(($token as IcCkToken).twinToken?.network.id) ||
		isNetworkIdETHMainnet(($token as IcCkToken).twinToken?.network.id);

	let ckBTC = false;
	$: ckBTC = mainnet && $tokenCkBtcLedger;

	let ckETH = false;
	$: ckETH = mainnet && $tokenCkEthLedger;

	let explorerUrl: string | undefined;
	$: explorerUrl = ckBTC
		? CKBTC_EXPLORER_URL
		: ckETH
			? CKETH_EXPLORER_URL
			: !$tokenCkBtcLedger && !$tokenCkEthLedger
				? `${ICP_EXPLORER_URL}/transactions`
				: undefined;
</script>

<TokenMenu>
	{#if nonNullish(explorerUrl)}
		<div in:fade>
			<ExternalLink
				href={explorerUrl}
				ariaLabel={$i18n.tokens.alt.open_dashboard}
				iconVisible={false}
			>
				{$i18n.navigation.text.view_on_explorer}
			</ExternalLink>
		</div>
	{/if}
</TokenMenu>
