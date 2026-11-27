<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { erc20CustomTokensInitialized } from '$eth/derived/erc20.derived';
	import { isTokenErc20 } from '$eth/utils/erc20.utils';
	import { icrcCustomTokensInitialized } from '$icp/derived/icrc.derived';
	import { isTokenIc } from '$icp/utils/icrc.utils';
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
	import type { Token, TokenId } from '$lib/types/token';
	import { splCustomTokensInitialized } from '$sol/derived/spl.derived';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	// Once saved, a token has an entry and no longer qualifies. A failed save waits for the next
	// session instead of being sent again with every balance update.
	const sentTokenIds = new SvelteSet<TokenId>();

	// A token's entry is known only once the custom tokens of its standard have loaded: before that,
	// a saved token shows without its version, and the backend would refuse a save of it. Each
	// standard counts on its own, since the ERC-20 and SPL lists load only while one of their
	// networks is on.
	const isCustomTokensLoaded = (token: Token): boolean =>
		(isTokenIc(token) && $icrcCustomTokensInitialized) ||
		(isTokenErc20(token) && $erc20CustomTokensInitialized) ||
		(isTokenSpl(token) && $splCustomTokensInitialized);

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
		}).filter((token) => !sentTokenIds.has(token.id) && isCustomTokensLoaded(token));

		if (isNullish(identity) || tokens.length === 0) {
			return;
		}

		tokens.forEach(({ id }) => sentTokenIds.add(id));

		saveSuggestedTokens({ identity, tokens }).catch(() => {
			// Like a failed save, left to the next session.
		});
	};

	const debounceSave = debounce(save);

	// A list that loads after the last balance update releases the tokens it held.
	$effect(() => {
		[
			$balancesStore,
			$icrcCustomTokensInitialized,
			$erc20CustomTokensInitialized,
			$splCustomTokensInitialized
		];

		untrack(debounceSave);
	});
</script>
