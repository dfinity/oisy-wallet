<script lang="ts">
	import { getContext } from 'svelte';
	import SignerAlert from '$lib/components/signer/SignerAlert.svelte';
	import SignerCenteredContent from '$lib/components/signer/SignerCenteredContent.svelte';
	import SignerLoading from '$lib/components/signer/SignerLoading.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SIGNER_CONTEXT_KEY, type SignerContext } from '$lib/stores/signer.store';
	import { toastsError } from '$lib/stores/toasts.store';

	const {
		callCanisterPrompt: { payload }
	} = getContext<SignerContext>(SIGNER_CONTEXT_KEY);

	const onPayload = () => {
		if ($payload?.status !== 'error') {
			return;
		}

		toastsError({
			msg: { text: $i18n.signer.call_canister.error.cannot_call },
			err: $payload.details
		});
	};

	$: ($payload, onPayload());
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
