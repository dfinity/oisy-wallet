<script lang="ts">
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { Spinner } from '@dfinity/gix-components';
	import { fade } from 'svelte/transition';
	import type { ProposalTypes } from '@walletconnect/types';
	import { EIP155_CHAINS } from '../../constants/eip155-chains.constants';
	import WalletConnectActions from './WalletConnectActions.svelte';
	import WalletConnectDomainVerification from './WalletConnectDomainVerification.svelte';
	import { acceptedContext } from '$eth/utils/wallet-connect.utils';
	import { isBusy } from '$lib/derived/busy.derived';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { addressNotCertified } from '$lib/derived/address.derived';

	export let proposal: Web3WalletTypes.SessionProposal | undefined | null;

	let params: ProposalTypes.Struct | undefined;
	$: params = proposal?.params;

	let approve = true;
	$: approve = acceptedContext(proposal?.verifyContext);

	const dispatch = createEventDispatcher();

	// Display a cancel button after a while if the WalletConnect initialization never resolves

	let timer: NodeJS.Timeout | undefined;
	let displayCancel = false;

	onMount(() => (timer = setTimeout(() => (displayCancel = true), 2000)));

	onDestroy(() => {
		if (isNullish(timer)) {
			return;
		}

		clearInterval(timer);
		timer = undefined;
	});
</script>

{#if nonNullish(proposal) && nonNullish(params)}
	<div in:fade>
		<p class="font-bold">Proposer: {params.proposer.metadata.name}</p>
		<p>{params.proposer.metadata.description}</p>
		<a href={params.proposer.metadata.url} rel="external noopener noreferrer" target="_blank"
			>{params.proposer.metadata.url}</a
		>

		<WalletConnectDomainVerification {proposal} />

		{#each Object.entries(params.requiredNamespaces) as [key, value]}
			{@const allMethods = value.methods}
			{@const allEvents = value.events}

			{#each value.chains ?? [] as chainId}
				{@const chainName = EIP155_CHAINS[chainId]?.name ?? ''}

				<p class="font-bold mt-6">
					Review {chainName} ({key}) required permissions:
				</p>

				<article class="bg-dust rounded-sm p-4 mt-4">
					<p class="font-bold">Methods:</p>

					<p>{allMethods.length ? allMethods.join(', ') : '-'}</p>

					<p class="font-bold mt-4">Events:</p>

					<p>{allEvents.length ? allEvents.join(', ') : '-'}</p>
				</article>
			{/each}
		{/each}

		<WalletConnectActions {approve} on:icApprove on:icReject />
	</div>
{:else}
	<div class="flex flex-col items-center justify-center my-2">
		<div>
			<Spinner inline />
		</div>
		<p>Connecting...</p>

		{#if displayCancel}
			<div class="flex justify-end gap-1 mt-8" in:fade>
				<button
					class="secondary"
					on:click={() => dispatch('icCancel')}
					disabled={$isBusy || $addressNotCertified}>Cancel</button
				>
			</div>
		{/if}
	</div>
{/if}
