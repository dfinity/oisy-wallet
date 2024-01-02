<script lang="ts">
	import type { ComponentType } from 'svelte';
	import type { Token, TokenStandard } from '$lib/types/token';
	import EthereumListener from '$lib/components/core/EthListener.svelte';
	import WalletListener from '$lib/components/core/WalletListener.svelte';
	import { isTokenStandardIc } from '$lib/utils/token.utils';

	export let token: Token;

	let standard: TokenStandard;
	$: ({ standard } = token);

	let cmp: ComponentType;
	$: cmp = isTokenStandardIc(standard) ? WalletListener : EthereumListener;
</script>

<svelte:component this={cmp} {token}>
	<slot />
</svelte:component>
