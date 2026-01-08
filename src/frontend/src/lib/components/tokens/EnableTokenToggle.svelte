<script lang="ts">
	import BtcManageTokenToggle from '$btc/components/tokens/BtcManageTokenToggle.svelte';
	import { isBitcoinToken } from '$btc/utils/token.utils';
	import { isTokenErc1155CustomToken } from '$eth/utils/erc1155.utils';
	import { isTokenErc20CustomToken } from '$eth/utils/erc20.utils';
	import { isTokenErc721CustomToken } from '$eth/utils/erc721.utils';
	import IcManageTokenToggle from '$icp/components/tokens/IcManageTokenToggle.svelte';
	import { isTokenExtCustomToken } from '$icp/utils/ext.utils';
	import { icTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
	import ManageTokenToggle from '$lib/components/tokens/ManageTokenToggle.svelte';
	import type { Token } from '$lib/types/token';
	import SolManageTokenToggle from '$sol/components/tokens/SolManageTokenToggle.svelte';
	import { isTokenSplCustomToken } from '$sol/utils/spl.utils';
	import { isSolanaToken } from '$sol/utils/token.utils';

	interface Props {
		token: Token;
		onToggle: (t: Token) => void;
	}

	const { token, onToggle }: Props = $props();
</script>

{#if icTokenIcrcCustomToken(token)}
	<IcManageTokenToggle onIcToken={(t) => onToggle(t)} {token} />
{:else if isTokenErc20CustomToken(token) || isTokenSplCustomToken(token) || isTokenErc721CustomToken(token) || isTokenErc1155CustomToken(token) || isTokenExtCustomToken(token)}
	<ManageTokenToggle onShowOrHideToken={(t) => onToggle(t)} {token} />
{:else if isBitcoinToken(token)}
	<BtcManageTokenToggle />
{:else if isSolanaToken(token)}
	<SolManageTokenToggle />
{/if}
