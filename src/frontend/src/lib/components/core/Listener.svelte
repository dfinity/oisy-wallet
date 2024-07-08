<script lang="ts">
	import type { ComponentType } from 'svelte';
	import type { OptionToken } from '$lib/types/token';
	import EthListener from '$eth/components/core/EthListener.svelte';
	import IcListener from '$icp/components/core/IcListener.svelte';
	import { isNetworkIdICP } from '$lib/utils/network.utils';
	import { isNullish } from '@dfinity/utils';
	import NoListener from '$lib/components/core/NoListener.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';

	export let token: OptionToken;

	let cmp: ComponentType;
	$: cmp =
		isNullish(token) || !$authSignedIn
			? NoListener
			: isNetworkIdICP(token.network.id)
				? IcListener
				: EthListener;
</script>

<svelte:component this={cmp} {token}>
	<slot />
</svelte:component>
