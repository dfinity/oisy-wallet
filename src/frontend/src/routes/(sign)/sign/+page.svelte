<script lang="ts">
	import type { AccountsPromptPayload } from '@dfinity/oisy-wallet-signer';
	import { isNullish } from '@dfinity/utils';
	import { onDestroy, setContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import SignerCallCanister from '$lib/components/signer/SignerCallCanister.svelte';
	import SignerConsentMessage from '$lib/components/signer/SignerConsentMessage.svelte';
	import SignerIdle from '$lib/components/signer/SignerIdle.svelte';
	import SignerPermissions from '$lib/components/signer/SignerPermissions.svelte';
	import SignerSignIn from '$lib/components/signer/SignerSignIn.svelte';
	import { authNotSignedIn, authIdentity } from '$lib/derived/auth.derived';
	import { initSignerContext, SIGNER_CONTEXT_KEY } from '$lib/stores/signer.store';

	const accountsPrompt = ({ approve }: AccountsPromptPayload) => {
		if (isNullish($authIdentity)) {
			// TODO show error
			return;
		}

		approve([{ owner: $authIdentity.getPrincipal().toText() }]);
	};

	// TODO: display test on notifyErrors

	const { idle, reset, ...context } = initSignerContext({ accountsPrompt });
	setContext(SIGNER_CONTEXT_KEY, { ...context, idle, reset });

	const init = () => {
		if (isNullish($authIdentity)) {
			reset();
			return;
		}

		context.init({ owner: $authIdentity });
	};

	onDestroy(reset);

	$: $authIdentity, init();
</script>

<article class="mb-10 flex min-h-96 flex-col rounded-lg border border-water bg-white px-5 py-6">
	{#if $authNotSignedIn}
		<SignerSignIn />
	{:else if $idle}
		<div in:fade={{ delay: 150, duration: 250 }}>
			<SignerIdle />
		</div>
	{:else}
		<SignerPermissions />

		<SignerConsentMessage />

		<SignerCallCanister />
	{/if}
</article>
