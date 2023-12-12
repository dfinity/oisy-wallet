<script lang="ts">
	import { type ComponentType } from 'svelte';
	import type { Token, TokenStandard } from '$lib/types/token';
	import EthereumListener from '$lib/components/core/EthereumListener.svelte';
	import IcpListener from '$lib/components/core/IcpListener.svelte';

	export let token: Token;

	let standard: TokenStandard;
	$: ({ standard } = token);

	let cmp: ComponentType;
	$: cmp = standard === 'icp' ? IcpListener : EthereumListener;
</script>

<svelte:component this={cmp} {token}>
	<slot />
</svelte:component>
