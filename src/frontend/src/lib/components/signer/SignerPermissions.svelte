<script lang="ts">
	import { type IcrcScope, type PermissionsConfirmation } from '@dfinity/oisy-wallet-signer';
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { SIGNER_CONTEXT_KEY, type SignerContext } from '$lib/stores/signer.store';

	const {
		permissionsPrompt: { payload, reset: resetPrompt }
	} = getContext<SignerContext>(SIGNER_CONTEXT_KEY);

	let scopes: IcrcScope[] | undefined;
	$: scopes = $payload?.requestedScopes;

	let confirm: PermissionsConfirmation | undefined;
	$: confirm = $payload?.confirmScopes;

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

			<ul class="flex flex-col gap-1 list-disc mt-2 mx-4">
			{#each scopes as scope}
				<li>{scope.scope.method}</li>
			{/each}
			</ul>
		</div>

		<ButtonGroup>
			<button type="button" class="secondary block flex-1" on:click={onReject}>Reject</button>
			<button type="submit" class="primary block flex-1">Approve</button>
		</ButtonGroup>
	</form>
{/if}
