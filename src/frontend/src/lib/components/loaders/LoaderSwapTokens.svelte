<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadSwapSupportedTokens } from '$lib/services/swap-supported-tokens.services';
	import { swapSupportedTokensStore } from '$lib/stores/swap-supported-tokens.store';
	import {untrack} from "svelte";

	$effect(() => {
		if (isNullish($authIdentity) || nonNullish($swapSupportedTokensStore)) {
			return;
		}

		try {
		untrack(()=>	loadSwapSupportedTokens({ identity: $authIdentity }));
		} catch (_: unknown) {
			// To avoid disrupting the user's flow, we really don't need to raise any errors
		}
	});
</script>
