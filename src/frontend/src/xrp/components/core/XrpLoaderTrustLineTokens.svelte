<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { xrpUnsavedTrustLineTokens } from '$xrp/derived/xrp-trust-line-tokens.derived';
	import { saveUnsavedXrpTrustLineTokens } from '$xrp/services/xrp-trust-line-tokens.services';

	$effect(() => {
		const identity = $authIdentity;
		const tokens = $xrpUnsavedTrustLineTokens;

		if (isNullish(identity) || tokens.length === 0) {
			return;
		}

		untrack(() => saveUnsavedXrpTrustLineTokens({ identity, tokens }));
	});
</script>
