<script lang="ts">
	import { type Snippet, untrack } from 'svelte';
	import { setIdbBalancesStore } from '$lib/api/idb-balances.api';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import { balancesStore } from '$lib/stores/balances.store';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	// We don't need to track identity and tokens changes for every store, since we are interested in the final result of the balances store.
	// And the balances store will be updated when the identity or tokens change too.
	// TODO: split it by single token to avoid unnecessary updates. This should happen directly
	$effect(() => {
		setIdbBalancesStore({
			identity: untrack(() => $authIdentity),
			tokens: untrack(() => $enabledTokens),
			balancesStoreData: $balancesStore
		});
	});
</script>

{@render children?.()}
