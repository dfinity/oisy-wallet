<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { TIPS_ENABLED } from '$env/tips.env';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadMyTips } from '$lib/services/tip.services';
	import { tipsStore } from '$lib/stores/tips.store';
	import type { NullishIdentity } from '$lib/types/identity';

	// Loaded for the reserve, not for History: a live tip holds an allowance
	// against the user's balance, and until these are known the wallet would offer
	// to spend money that is already promised. History reads the same store.
	const load = async (identity: NullishIdentity) => {
		if (isNullish(identity) || !TIPS_ENABLED) {
			tipsStore.reset();
			return;
		}

		try {
			tipsStore.set(await loadMyTips({ identity }));
		} catch (_: unknown) {
			// Non-fatal, and deliberately quiet: a failed load leaves the store
			// unloaded rather than pretending nothing is reserved.
			tipsStore.reset();
		}
	};

	$effect(() => {
		void load($authIdentity);
	});

	const reload = () => {
		void load($authIdentity);
	};
</script>

<svelte:window onoisyRefreshTips={reload} />
