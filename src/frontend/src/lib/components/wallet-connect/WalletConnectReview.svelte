<script lang="ts">
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { nonNullish } from '@dfinity/utils';
	import { Spinner } from '@dfinity/gix-components';
	import { fade } from 'svelte/transition';
	import type { ProposalTypes } from '@walletconnect/types';
	import { EIP155_CHAINS } from '$lib/constants/chains';
	import Hr from '$lib/components/ui/Hr.svelte';
	import {createEventDispatcher} from "svelte";
	import {isBusy} from "$lib/stores/busy.store";

	export let proposal: Web3WalletTypes.SessionProposal | undefined | null;

	let params: ProposalTypes.Struct | undefined;
	$: params = proposal?.params;

	$: console.log(
		params,
		params?.requiredNamespaces !== undefined ? Object.entries(params.requiredNamespaces) : undefined
	);

	const dispatch = createEventDispatcher();
</script>

{#if nonNullish(proposal) && nonNullish(params)}
	<div in:fade>
		<p class="font-bold">{params.proposer.metadata.name}</p>
		<a href={params.proposer.metadata.url} rel="external noopener noreferrer" target="_blank"
			>{params.proposer.metadata.url}</a
		>

		<Hr />

		{#each Object.entries(params.requiredNamespaces) as [key, value]}
			{@const allMethods = value.methods}
			{@const allEvents = value.events}

			{#each value.chains as chainId}
				<p class="font-bold mt-2">
					Review {EIP155_CHAINS[chainId]?.name ?? ''} ({key}) permissions:
				</p>

				<article class="bg-deep-violet text-ghost-white rounded-sm p-2 mt-2">
					<p class="font-bold">Methods:</p>

					<p>{allMethods.length ? allMethods.join(', ') : '-'}</p>

					<p class="font-bold mt-1">Events:</p>

					<p>{allEvents.length ? allEvents.join(', ') : '-'}</p>
				</article>
			{/each}
		{/each}

		<div class="flex justify-end gap-1 mt-4">
			<button class="primary" on:click={() => dispatch("icReject")} disabled={$isBusy}>Reject</button>
			<button class="primary" on:click={() => dispatch("icApprove")} disabled={$isBusy}> Approve </button>
		</div>
	</div>
{:else}
	<div class="flex flex-col items-center justify-center">
		<div>
			<Spinner inline />
		</div>
		<p>Connecting...</p>
	</div>
{/if}
