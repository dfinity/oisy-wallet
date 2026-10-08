<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { TIPS_ENABLED } from '$env/tips.env';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadMyTips } from '$lib/services/tip.services';
	import { tipsStore } from '$lib/stores/tips.store';
	import type { NullishIdentity } from '$lib/types/identity';

	// Guards against a stale reply from a previous identity's in-flight
	// `loadMyTips`. Mirrors `LoaderTokens`, which needs it for the same reason:
	// signing out or switching account during a canister call leaves the reply on
	// its way, and applying a late one would put the previous user's tips — and so
	// the previous user's reservations — in front of whoever is signed in now. A
	// refresh racing the sign-in load is the same problem without the disclosure.
	let fetchGeneration = 0;

	// Loaded for the reserve, not for History: a live tip holds an allowance
	// against the user's balance, and until these are known the wallet would offer
	// to spend money that is already promised. History reads the same store.
	const load = async (identity: NullishIdentity) => {
		const generation = ++fetchGeneration;

		// Unguarded on purpose: this branch runs synchronously, so it is by
		// definition the newest request, and bumping the counter above has already
		// disowned anything still in flight.
		if (isNullish(identity) || !TIPS_ENABLED) {
			tipsStore.reset();
			return;
		}

		try {
			const tips = await loadMyTips({ identity });

			if (generation !== fetchGeneration) {
				return;
			}

			tipsStore.set(tips);
		} catch (_: unknown) {
			if (generation !== fetchGeneration) {
				return;
			}

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
