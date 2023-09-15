<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { acceptedContext } from '$lib/utils/wallet-connect.utils';

	const dispatch = createEventDispatcher();

	export let proposal: Web3WalletTypes.SessionProposal | undefined | null;
</script>

<div class="flex justify-end gap-1 mt-4">
	<button class="primary" on:click={() => dispatch('icReject')} disabled={$isBusy}>Reject</button>

	{#if acceptedContext(proposal?.verifyContext)}
		<button class="primary" on:click={() => dispatch('icApprove')} disabled={$isBusy}>
			Approve
		</button>
	{/if}
</div>
