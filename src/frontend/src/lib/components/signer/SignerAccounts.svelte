<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext, type Snippet, untrack } from 'svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { SIGNER_CONTEXT_KEY, type SignerContext } from '$lib/stores/signer.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const {
		accountsPrompt: { payload, reset: resetPrompt }
	} = getContext<SignerContext>(SIGNER_CONTEXT_KEY);

	const onAccountsPrompt = () => {
		if (isNullish($authIdentity)) {
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

	$effect(() => {
		[$payload];

		untrack(() => onAccountsPrompt());
	});
</script>

{@render children()}
