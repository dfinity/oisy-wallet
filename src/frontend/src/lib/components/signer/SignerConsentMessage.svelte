<script lang="ts">
	import { Markdown } from '@dfinity/gix-components';
	import type {
		ConsentMessageApproval,
		Rejection,
		ResultConsentInfo
	} from '@dfinity/oisy-wallet-signer';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { run, preventDefault } from 'svelte/legacy';
	import { fade } from 'svelte/transition';
	import SignerConsentMessageWarning from '$lib/components/signer/SignerConsentMessageWarning.svelte';
	import SignerLoading from '$lib/components/signer/SignerLoading.svelte';
	import SignerOrigin from '$lib/components/signer/SignerOrigin.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SIGNER_CONTEXT_KEY, type SignerContext } from '$lib/stores/signer.store';
	import { toastsError } from '$lib/stores/toasts.store';

	const {
		consentMessagePrompt: { payload, reset: resetPrompt },
		callCanisterPrompt: { reset: resetCallCanisterPrompt }
	} = getContext<SignerContext>(SIGNER_CONTEXT_KEY);

	let approve: ConsentMessageApproval | undefined = $state();
	let reject: Rejection | undefined = $state();
	let consentInfo: ResultConsentInfo | undefined = $state();

	run(() => {
		({ approve, reject, consentInfo } =
			nonNullish($payload) && $payload.status === 'result'
				? $payload
				: { approve: undefined, reject: undefined, consentInfo: undefined });
	});

	let loading = $state(false);
	let displayMessage: string | undefined = $state();

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

		const consentInfoMsg = nonNullish(consentInfo)
			? 'Warn' in consentInfo
				? consentInfo.Warn.consentInfo
				: consentInfo.Ok
			: undefined;

		displayMessage =
			nonNullish(consentInfoMsg) && 'GenericDisplayMessage' in consentInfoMsg.consent_message
				? consentInfoMsg.consent_message.GenericDisplayMessage
				: undefined;
	};

	run(() => {
		($payload, onPayload());
	});

	type Text = { title: string; content: string } | undefined;

	// We try to split the content and title because we received a chunk of unstructured text from the canister. This works well for the ICP ledger, but we will likely need to iterate on it. There are a few tasks documented in the backlog.
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

	let text: Text = $derived(mapText(displayMessage));

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

		reject();
		resetPrompt();
	};
</script>

{#if loading}
	<SignerLoading>
		{$i18n.signer.consent_message.text.loading}
	</SignerLoading>
{:else if nonNullish(text)}
	{@const { title, content } = text}

	<form method="POST" onsubmit={preventDefault(onApprove)} in:fade>
		<h2 class="mb-4 text-center">{title}</h2>

		<SignerOrigin payload={$payload} />

		<SignerConsentMessageWarning {consentInfo} />

		<div class="msg mb-6 break-all rounded-lg border border-off-white px-8 py-4">
			<Markdown text={content} />
		</div>

		<ButtonGroup>
			<Button colorStyle="error" onclick={onReject}>
				{$i18n.core.text.reject}
			</Button>
			<Button colorStyle="success" type="submit">
				{$i18n.core.text.approve}
			</Button>
		</ButtonGroup>
	</form>
{/if}

<style lang="scss">
	// We are using global selector because we try to style a Markdown section that is generated on the fly when the consent message can be successfully fetched.
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
