<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { SIGNER_CONTEXT_KEY, type SignerContext } from '$lib/stores/signer.store';

	const {
		accountsPrompt: { payload, reset: resetPrompt }
	} = getContext<SignerContext>(SIGNER_CONTEXT_KEY);

	const onAccountsPrompt = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (isNullish($payload)) {
			// Payload has been reset. Nothing to do.
			return;
		}

		const { approve } = $payload;

		approve([{ owner: $authIdentity.getPrincipal().toText() }]);

		resetPrompt();
	};

	$: ($payload, (async () => await onAccountsPrompt())());
</script>

<slot />
