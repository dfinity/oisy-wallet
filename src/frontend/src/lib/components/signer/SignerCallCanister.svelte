<script lang="ts">
	import { getContext } from 'svelte';
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

	$: $payload, onPayload();
</script>

{#if $payload?.status === 'loading'}
	<SignerLoading>
		{$i18n.signer.call_canister.text.processing}
	</SignerLoading>
{:else if $payload?.status === 'error'}
	<h2 class="text-center mb-4">{$i18n.signer.call_canister.text.executed}</h2>

	<p class="text-center mt-10 font-bold pb-12">{$i18n.signer.call_canister.text.close_window}</p>
{:else if $payload?.status === 'result'}
	<h2 class="text-center mb-4">{$i18n.signer.call_canister.text.error}</h2>

	<p class="text-center mt-10 font-bold pb-12">{$i18n.signer.call_canister.text.try_again}</p>
{/if}
