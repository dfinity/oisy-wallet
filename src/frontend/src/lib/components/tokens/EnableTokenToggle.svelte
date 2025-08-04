<script lang="ts">
	import BtcManageTokenToggle from '$btc/components/tokens/BtcManageTokenToggle.svelte';
	import { isBitcoinToken } from '$btc/utils/token.utils';
	import { isTokenErc1155CustomToken } from '$eth/utils/erc1155.utils';
	import { isTokenEthereumUserToken } from '$eth/utils/erc20.utils';
	import { isTokenErc721CustomToken } from '$eth/utils/erc721.utils';
	import IcManageTokenToggle from '$icp/components/tokens/IcManageTokenToggle.svelte';
	import { icTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
	import ManageTokenToggle from '$lib/components/tokens/ManageTokenToggle.svelte';
	import type { Token } from '$lib/types/token';
	import SolManageTokenToggle from '$sol/components/tokens/SolManageTokenToggle.svelte';
	import { isTokenSplToggleable } from '$sol/utils/spl.utils';
	import { isSolanaToken } from '$sol/utils/token.utils';

	interface Props {
		token: Token;
		onToggle: (t: CustomEvent<Token>) => void;
	}

	const { token, onToggle }: Props = $props();
</script>

{#if icTokenIcrcCustomToken(token)}
	<IcManageTokenToggle {token} on:icToken={(t) => onToggle(t)} />
{:else if isTokenEthereumUserToken(token) || isTokenSplToggleable(token) || isTokenErc721CustomToken(token) || isTokenErc1155CustomToken(token)}
	<ManageTokenToggle {token} on:icShowOrHideToken={(t) => onToggle(t)} />
{:else if isBitcoinToken(token)}
	<BtcManageTokenToggle />
{:else if isSolanaToken(token)}
	<SolManageTokenToggle />
{/if}
