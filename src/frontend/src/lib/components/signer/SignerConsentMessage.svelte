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
	import SignerOrigin from '$lib/components/signer/SignerOrigin.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { SIGNER_CONTEXT_KEY, type SignerContext } from '$lib/stores/signer.store';

	const {
		consentMessagePrompt: { payload, reset: resetPrompt }
	} = getContext<SignerContext>(SIGNER_CONTEXT_KEY);

	let approve: ConsentMessageApproval | undefined;
	$: approve = $payload?.approve;

	let reject: Rejection | undefined;
	$: reject = $payload?.reject;

	let consentInfo: icrc21_consent_info | undefined;
	$: consentInfo = $payload?.consentInfo;

	let displayMessage: string | undefined;
	$: displayMessage = nonNullish(consentInfo)
		? (consentInfo.consent_message as { GenericDisplayMessage: string }).GenericDisplayMessage
		: undefined;

	type Text = { title: string; content: string } | undefined;

	const mapText = (markdown: string | undefined): Text => {
		if (isNullish(markdown)) {
			return undefined;
		}

		const [title, ...rest] = markdown.split('\n\n');

		return {
			title: title.replaceAll('#', '').trim(),
			content: (rest ?? []).join('\n\n')
		};
	};

	let text: Text;
	$: text = mapText(displayMessage);

	const onApprove = () => {
		// TODO: handle error if not defined?
		approve?.();
		resetPrompt();
	};

	const onReject = () => {
		// TODO: handle error if not defined?
		reject?.();
		resetPrompt();
	};
</script>

{#if nonNullish(text)}
	{@const { title, content } = text}

	<form in:fade on:submit|preventDefault={onApprove} method="POST">
		<h2 class="text-center mb-4">{title}</h2>

		<SignerOrigin payload={$payload} />

		<div class="border border-light-blue px-8 py-4 mb-6 rounded-lg msg">
			<Markdown text={content} />
		</div>

		<ButtonGroup>
			<button type="button" class="secondary block flex-1" on:click={onReject}>Reject</button>
			<button type="submit" class="primary block flex-1">Approve</button>
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
