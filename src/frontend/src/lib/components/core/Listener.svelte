<script lang="ts">
	import type { ComponentType } from 'svelte';
	import type { Token } from '$lib/types/token';
	import EthListener from '$eth/components/core/EthListener.svelte';
	import IcListener from '$icp/components/core/IcListener.svelte';
	import { isNetworkIdICP } from '$lib/utils/network.utils';

	export let token: Token;

	let cmp: ComponentType;
	$: cmp = isNetworkIdICP(token.network.id) ? IcListener : EthListener;
</script>

<svelte:component this={cmp} {token}>
	<slot />
</svelte:component>
