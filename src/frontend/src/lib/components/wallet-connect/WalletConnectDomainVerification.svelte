<script lang="ts">
	import type { Verify } from '@walletconnect/types';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';

	export let proposal: Web3WalletTypes.SessionProposal | undefined | null;

	let context: Verify.Context | undefined = undefined;
	$: context = proposal?.verifyContext;

	let validation: 'UNKNOWN' | 'VALID' | 'INVALID' | undefined;
	$: validation = context?.verified.validation;
</script>

<div class="mt-3">
	<label for="verification" class="font-bold"
		>Domain Verification:
		{#if validation === 'VALID'}
			Valid ✅
		{:else if validation === 'INVALID'}
			Invalid ❌
		{:else}
			Unknown ❓
		{/if}</label
	>
	<div id="verification" class="font-normal mb-2 break-words">
		{#if validation === 'VALID'}
			Domain validation passed.
		{:else if validation === 'INVALID'}
			This website has a domain that does not match the sender of the request.
		{:else}
			This domain cannot be verified.
		{/if}
	</div>
</div>
