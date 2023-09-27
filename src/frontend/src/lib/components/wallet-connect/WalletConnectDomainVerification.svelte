<script lang="ts">
	import type { Verify } from '@walletconnect/types';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { CONTEXT_VALIDATION_ISSCAM } from '$lib/constants/wallet-connect.constants';

	export let proposal: Web3WalletTypes.SessionProposal | undefined | null;

	let context: Verify.Context | undefined = undefined;
	$: context = proposal?.verifyContext;

	let validation: 'UNKNOWN' | 'VALID' | 'INVALID' | string | undefined;
	$: validation = context?.verified.validation;
</script>

<div class="mt-3">
	<label for="verification" class="font-bold"
		>Domain Verification:
		{#if validation === 'VALID'}
			Valid ✅
		{:else if validation === 'INVALID'}
			Invalid ❌
		{:else if validation?.toUpperCase() === CONTEXT_VALIDATION_ISSCAM}
			Security risk ⚠️
		{:else}
			Unknown ❓
		{/if}</label
	>
	<div id="verification" class="font-normal mb-2 break-words">
		{#if validation === 'VALID'}
			The validation of the proposer's domain passed.
		{:else if validation === 'INVALID'}
			The domain of the proposer's website does not match the sender of the request.
		{:else if validation?.toUpperCase() === CONTEXT_VALIDATION_ISSCAM}
			The proposer's website is flagged as unsafe.
		{:else}
			The domain of the proposer cannot be verified.
		{/if}
	</div>
</div>
