<script lang="ts">
	import type { ComponentType } from 'svelte';
	import type { Token, TokenStandard } from '$lib/types/token';
	import EthereumListener from '$lib/components/core/EthListener.svelte';
	import IcListener from '$lib/components/core/IcListener.svelte';
	import { isTokenStandardIc } from '$lib/utils/token.utils';

	export let token: Token;

	let standard: TokenStandard;
	$: ({ standard } = token);

	let cmp: ComponentType;
	$: cmp = isTokenStandardIc(standard) ? IcListener : EthereumListener;
</script>

<svelte:component this={cmp} {token}>
	<slot />
</svelte:component>
