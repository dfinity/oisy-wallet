<script lang="ts">
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { nonNullish } from '@dfinity/utils';
	import { Spinner } from '@dfinity/gix-components';
	import { fade } from 'svelte/transition';
	import type { ProposalTypes } from '@walletconnect/types';
	import { EIP155_CHAINS } from '$lib/constants/eip155-chains.constants';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import type { Verify } from '@walletconnect/types';
	import { verifyContextStatus } from '$lib/utils/wallet-connect.utils';

	export let proposal: Web3WalletTypes.SessionProposal | undefined | null;

	let params: ProposalTypes.Struct | undefined;
	$: params = proposal?.params;

	let context: Verify.Context | undefined = undefined;
	$: context = proposal?.verifyContext;

	let contextVerification: string;
	$: contextVerification = verifyContextStatus(context);
</script>

{#if nonNullish(proposal) && nonNullish(params)}
	<div in:fade>
		<p class="font-bold">Proposer: {params.proposer.metadata.name}</p>
		<p>{params.proposer.metadata.description}</p>
		<a href={params.proposer.metadata.url} rel="external noopener noreferrer" target="_blank"
			>{params.proposer.metadata.url}</a
		>

		<div class="mt-3">
			<label for="verification" class="font-bold">Domain Verification:</label>
			<div id="verification" class="font-normal mb-2 break-words">{contextVerification}</div>
		</div>

		{#each Object.entries(params.requiredNamespaces) as [key, value]}
			{@const allMethods = value.methods}
			{@const allEvents = value.events}

			{#each value.chains ?? [] as chainId}
				{@const chainName = EIP155_CHAINS[chainId]?.name ?? ''}

				<p class="font-bold mt-3">
					Review {chainName} ({key}) required permissions:
				</p>

				<article class="bg-dust rounded-sm p-2 mt-1">
					<p class="font-bold">Methods:</p>

					<p>{allMethods.length ? allMethods.join(', ') : '-'}</p>

					<p class="font-bold mt-1">Events:</p>

					<p>{allEvents.length ? allEvents.join(', ') : '-'}</p>
				</article>
			{/each}
		{/each}

		<WalletConnectActions on:icApprove on:icReject />
	</div>
{:else}
	<div class="flex flex-col items-center justify-center">
		<div>
			<Spinner inline />
		</div>
		<p>Connecting...</p>
	</div>
{/if}
