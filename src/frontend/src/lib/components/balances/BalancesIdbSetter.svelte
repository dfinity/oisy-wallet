<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { setIdbBalancesStore } from '$lib/api/idb-balances.api';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import { balancesStore } from '$lib/stores/balances.store';

	// We don't need to track identity and tokens changes for every store, since we are interested in the final result of the balances store.
	// And the balances store will be updated when the identity or tokens change too.
	// TODO: split it by single token to avoid unnecessary updates. This should happen directly
	const debounceSetIdbBalancesStore = debounce(() => {
		setIdbBalancesStore({
			identity: untrack(() => $authIdentity),
			tokens: untrack(() => $enabledTokens),
			balancesStoreData: $balancesStore
		});
	});

	$effect(() => {
		[$balancesStore];

		debounceSetIdbBalancesStore();
	});
</script>
