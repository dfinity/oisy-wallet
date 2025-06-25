<script lang="ts">
	import { icTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
	import IcManageTokenToggle from '$icp/components/tokens/IcManageTokenToggle.svelte';
	import { isTokenEthereumUserToken } from '$eth/utils/erc20.utils';
	import { isTokenSplToggleable } from '$sol/utils/spl.utils';
	import ManageTokenToggle from '$lib/components/tokens/ManageTokenToggle.svelte';
	import BtcManageTokenToggle from '$btc/components/tokens/BtcManageTokenToggle.svelte';
	import SolManageTokenToggle from '$sol/components/tokens/SolManageTokenToggle.svelte';
	import type { Token } from '$lib/types/token';
	import { isBitcoinToken } from '$btc/utils/token.utils';
	import { isSolanaToken } from '$sol/utils/token.utils';

	interface Props {
		token: Token;
		onToggle: (t: CustomEvent<Token>) => void;
	}

	const { token, onToggle }: Props = $props();
</script>

{#if icTokenIcrcCustomToken(token)}
	<IcManageTokenToggle {token} on:icToken={(t) => onToggle(t)} />
{:else if isTokenEthereumUserToken(token) || isTokenSplToggleable(token)}
	<ManageTokenToggle {token} on:icShowOrHideToken={(t) => onToggle(t)} />
{:else if isBitcoinToken(token)}
	<BtcManageTokenToggle />
{:else if isSolanaToken(token)}
	<SolManageTokenToggle />
{/if}
