<script lang="ts">
	import {
		type icrc21_consent_info,
		type ConsentMessageApproval,
		type Rejection
	} from '@dfinity/oisy-wallet-signer';
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
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

{#if nonNullish(displayMessage)}
	<form in:fade on:submit|preventDefault={onApprove} method="POST">
		<h2 class="text-center mb-6">Connect your wallet</h2>

		<div class="bg-light-blue p-6 mb-6 rounded-lg">

			{displayMessage}
		</div>

		<ButtonGroup>
			<button type="button" class="secondary block flex-1" on:click={onReject}>Reject</button>
			<button type="submit" class="primary block flex-1">Approve</button>
		</ButtonGroup>
	</form>
{/if}
