<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		modalHideToken,
		modalIcHideToken,
		modalManageTokens,
		modalSolHideToken
	} from '$lib/derived/modal.derived';
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
		// Token-management dialogs retain a token's version while editing or confirming a hide.
		// A new entry would invalidate it. The next balance update after the dialog closes tries again.
		if ($modalManageTokens || $modalHideToken || $modalIcHideToken || $modalSolHideToken) {
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
