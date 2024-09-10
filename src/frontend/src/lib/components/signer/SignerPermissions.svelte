<script lang="ts">
	import {
		ICRC25_REQUEST_PERMISSIONS,
		type IcrcScope,
		type PermissionsConfirmation,
		type PermissionsPromptPayload
	} from '@dfinity/oisy-wallet-signer';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import type { OptionSigner } from '$lib/types/signer';

	export let signer: OptionSigner;

	let payload: PermissionsPromptPayload | undefined;

	let scopes: IcrcScope[] | undefined;
	$: scopes = payload?.requestedScopes;

	let confirm: PermissionsConfirmation | undefined;
	$: confirm = payload?.confirmScopes;

	const resetPrompt = () => (payload = undefined);

	const init = () => {
		if (isNullish(signer)) {
			resetPrompt();
			return;
		}

		signer.register({
			method: ICRC25_REQUEST_PERMISSIONS,
			prompt: (p: PermissionsPromptPayload) => (payload = p)
		});
	};

	$: signer, init();

	const onReject = () => {
		// TODO: assert no undefined and toast error
		confirm?.((scopes ?? []).map((scope) => ({ ...scope, state: 'denied' })));

		resetPrompt();
	};

	const onApprove = () => {
		// TODO: assert no undefined and toast error
		confirm?.((scopes ?? []).map((scope) => ({ ...scope, state: 'granted' })));

		resetPrompt();
	};
</script>

{#if nonNullish(scopes)}
	<form in:fade on:submit|preventDefault={onApprove} method="POST">
		<h2 class="text-center mb-6">Review permissions</h2>

		<div class="bg-light-blue p-6 mb-6 rounded-lg">
			<p class="break-normal font-bold">The dApp is requesting following permissions:</p>

			{#each scopes as scope}
				<p class="break-normal pt-2.5 flex items-center gap-2">{scope.scope.method}</p>
			{/each}
		</div>

		<ButtonGroup>
			<button type="button" class="secondary block flex-1" on:click={onReject}>Reject</button>
			<button type="submit" class="primary block flex-1">Approve</button>
		</ButtonGroup>
	</form>
{/if}
