<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext, type Snippet, untrack } from 'svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_SUBCONTEXT_SIGNER,
		PLAUSIBLE_EVENT_TYPES_SIGNER,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { SIGNER_CONTEXT_KEY, type SignerContext } from '$lib/stores/signer.store';
	import { mapSignerOriginHost } from '$lib/utils/signer.utils';

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

		const { approve, origin } = $payload;

		trackEvent({
			name: PLAUSIBLE_EVENTS.SIGNER_INTERACTION,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.SIGNER,
				event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_SIGNER.ACCOUNTS,
				event_type: PLAUSIBLE_EVENT_TYPES_SIGNER.REQUESTED,
				dapp_origin: mapSignerOriginHost(origin)
			}
		});

		approve([{ owner: $authIdentity.getPrincipal().toText() }]);

		resetPrompt();
	};

	$effect(() => {
		[$payload];

		untrack(() => onAccountsPrompt());
	});
</script>

{@render children()}
