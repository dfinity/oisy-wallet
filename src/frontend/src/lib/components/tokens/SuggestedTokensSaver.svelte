<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalManageTokens } from '$lib/derived/modal.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import {
		findSuggestedTokensWithBalance,
		saveSuggestedTokens
	} from '$lib/services/suggested-tokens.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import type { TokenId } from '$lib/types/token';

	// Once saved, a token has an entry and no longer qualifies. A failed save waits for the next
	// session instead of being sent again with every balance update.
	const sentTokenIds = new SvelteSet<TokenId>();

	const save = () => {
		// Manage tokens keeps a toggled token without the version a new entry would give it, so a save
		// now would make the user's own Save fail. The next balance update after it closes tries again.
		if ($modalManageTokens) {
			return;
		}

		const identity = $authIdentity;

		const tokens = findSuggestedTokensWithBalance({
			tokens: $enabledTokens,
			balances: $balancesStore
		}).filter(({ id }) => !sentTokenIds.has(id));

		if (isNullish(identity) || tokens.length === 0) {
			return;
		}

		tokens.forEach(({ id }) => sentTokenIds.add(id));

		saveSuggestedTokens({ identity, tokens }).catch(() => {
			// Like a failed save, left to the next session.
		});
	};

	const debounceSave = debounce(save);

	$effect(() => {
		[$balancesStore];

		untrack(debounceSave);
	});
</script>
