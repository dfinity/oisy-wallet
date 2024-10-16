<script lang="ts">
	import { Markdown } from '@dfinity/gix-components';
	import type {
		icrc21_consent_info,
		ConsentMessageApproval,
		Rejection
	} from '@dfinity/oisy-wallet-signer';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import SignerLoading from '$lib/components/signer/SignerLoading.svelte';
	import SignerOrigin from '$lib/components/signer/SignerOrigin.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SIGNER_CONTEXT_KEY, type SignerContext } from '$lib/stores/signer.store';
	import { toastsError } from '$lib/stores/toasts.store';

	const {
		consentMessagePrompt: { payload, reset: resetPrompt },
		callCanisterPrompt: { reset: resetCallCanisterPrompt }
	} = getContext<SignerContext>(SIGNER_CONTEXT_KEY);

	let approve: ConsentMessageApproval | undefined;
	$: approve = $payload?.status === 'result' ? $payload?.approve : undefined;

	let reject: Rejection | undefined;
	$: reject = $payload?.status === 'result' ? $payload?.reject : undefined;

	let consentInfo: icrc21_consent_info | undefined;
	$: consentInfo = $payload?.status === 'result' ? $payload?.consentInfo : undefined;

	let loading = false;
	let displayMessage: string | undefined;

	const onPayload = () => {
		if ($payload?.status === 'loading') {
			displayMessage = undefined;
			loading = true;

			// In case the relying party has not closed the window between the last call and requesting a new call, we reset the call canister prompt; otherwise, we might display both the previous result screen and the consent message.
			// Note that the library handles the case where the relying party tries to submit another call while a call is still being processed. Therefore, we cannot close a prompt here that is not yet finished.
			resetCallCanisterPrompt();

			return;
		}

		loading = false;

		if ($payload?.status === 'error') {
			toastsError({
				msg: { text: $i18n.signer.consent_message.error.retrieve },
				err: $payload.details
			});
			return;
		}

		displayMessage =
			nonNullish(consentInfo) && 'GenericDisplayMessage' in consentInfo.consent_message
				? consentInfo.consent_message.GenericDisplayMessage
				: undefined;
	};

	$: $payload, onPayload();

	type Text = { title: string; content: string } | undefined;

	const mapText = (markdown: string | undefined): Text => {
		if (isNullish(markdown)) {
			return undefined;
		}

		const [title, ...rest] = markdown.split('\n');

		return {
			title: title.replace(/^#+\s*/, '').trim(),
			content: (rest ?? []).join('\n')
		};
	};

	let text: Text;
	$: text = mapText(displayMessage);

	const onApprove = () => {
		if (isNullish(approve)) {
			toastsError({
				msg: { text: $i18n.signer.consent_message.error.no_approve_callback }
			});

			resetPrompt();
			return;
		}

		approve?.();
		resetPrompt();
	};

	const onReject = () => {
		if (isNullish(reject)) {
			toastsError({
				msg: { text: $i18n.signer.consent_message.error.no_reject_callback }
			});

			resetPrompt();
			return;
		}

		reject?.();
		resetPrompt();
	};
</script>

{#if loading}
	<SignerLoading>
		{$i18n.signer.consent_message.text.loading}
	</SignerLoading>
{:else if nonNullish(text)}
	{@const { title, content } = text}

	<form in:fade on:submit|preventDefault={onApprove} method="POST">
		<h2 class="mb-4 text-center">{title}</h2>

		<SignerOrigin payload={$payload} />

		<div class="msg mb-6 rounded-lg border border-dust px-8 py-4">
			<Markdown text={content} />
		</div>

		<ButtonGroup>
			<button type="button" class="error block flex-1" on:click={onReject}
				>{$i18n.core.text.reject}</button
			>
			<button type="submit" class="success block flex-1">{$i18n.core.text.approve}</button>
		</ButtonGroup>
	</form>
{/if}

<style lang="scss">
	.msg {
		:global(p) {
			margin: 0 0 var(--padding);
		}

		:global(strong) {
			display: block;
		}

		:global(p:last-of-type) {
			margin-bottom: 0;
		}
	}
</style>
