<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, untrack } from 'svelte';
	import SignerAlert from '$lib/components/signer/SignerAlert.svelte';
	import SignerCenteredContent from '$lib/components/signer/SignerCenteredContent.svelte';
	import SignerLoading from '$lib/components/signer/SignerLoading.svelte';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_RESULT_STATUSES,
		PLAUSIBLE_EVENT_SUBCONTEXT_SIGNER,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SIGNER_CONTEXT_KEY, type SignerContext } from '$lib/stores/signer.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import {  mapSignerOriginHost } from '$lib/utils/signer.utils';

	const STATUS_RESULT_MAP: Record<string, string> = {
		executing: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
		result: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
		error: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR
	};

	const {
		callCanisterPrompt: { payload }
	} = getContext<SignerContext>(SIGNER_CONTEXT_KEY);

	const onPayload = () => {
		if (nonNullish($payload)) {
			const resultStatus = STATUS_RESULT_MAP[$payload.status];

			if (nonNullish(resultStatus)) {
				trackEvent({
					name: PLAUSIBLE_EVENTS.SIGNER_INTERACTION,
					metadata: {
						event_context: PLAUSIBLE_EVENT_CONTEXTS.SIGNER,
						event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_SIGNER.CALL_CANISTER,
						result_status: resultStatus,
						dapp_origin: mapSignerOriginHost($payload.origin),
					}
				});
			}
		}

		if ($payload?.status !== 'error') {
			return;
		}

		toastsError({
			msg: { text: $i18n.signer.call_canister.error.cannot_call },
			err: $payload.details
		});
	};

	$effect(() => {
		[$payload];

		untrack(() => onPayload());
	});
</script>

{#if $payload?.status === 'executing'}
	<SignerLoading>
		{$i18n.signer.call_canister.text.processing}
	</SignerLoading>
{:else if $payload?.status === 'result'}
	<SignerCenteredContent>
		<h2 class="mb-4 text-center">{$i18n.signer.call_canister.text.executed}</h2>

		<SignerAlert alertType="ok" />

		<p class="mt-10 text-center font-bold">{$i18n.signer.call_canister.text.close_window}</p>
	</SignerCenteredContent>
{:else if $payload?.status === 'error'}
	<SignerCenteredContent>
		<h2 class="mb-4 text-center">{$i18n.signer.call_canister.text.error}</h2>

		<SignerAlert alertType="error" />

		<p class="mt-10 text-center font-bold">{$i18n.signer.call_canister.text.try_again}</p>
	</SignerCenteredContent>
{/if}
