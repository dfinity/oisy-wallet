<script lang="ts">
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { Spinner } from '@dfinity/gix-components';
	import { fade } from 'svelte/transition';
	import type { ProposalTypes } from '@walletconnect/types';
	import { EIP155_CHAINS } from '$env/eip155-chains.env';
	import WalletConnectActions from './WalletConnectActions.svelte';
	import WalletConnectDomainVerification from './WalletConnectDomainVerification.svelte';
	import { acceptedContext } from '$eth/utils/wallet-connect.utils';
	import { isBusy } from '$lib/derived/busy.derived';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { addressNotCertified } from '$lib/derived/address.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';

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
	<div class="stretch" in:fade>
		<p class="font-bold">{$i18n.wallet_connect.text.proposer}: {params.proposer.metadata.name}</p>
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
					{replacePlaceholders($i18n.wallet_connect.text.review, {
						$chain_name: chainName,
						$key: key
					})}:
				</p>

				<article class="bg-dust rounded-sm p-4 mt-4">
					<p class="font-bold">{$i18n.wallet_connect.text.methods}:</p>

					<p>{allMethods.length ? allMethods.join(', ') : '-'}</p>

					<p class="font-bold mt-4">{$i18n.wallet_connect.text.events}:</p>

					<p>{allEvents.length ? allEvents.join(', ') : '-'}</p>
				</article>
			{/each}
		{/each}
	</div>

	<div in:fade>
		<WalletConnectActions {approve} on:icApprove on:icReject />
	</div>
{:else}
	<div class="stretch">
		<div class="flex flex-col items-center justify-center h-[100%] gap-2 min-h-[30vh] pt-8">
			<div>
				<Spinner inline />
			</div>
			<p>{$i18n.wallet_connect.text.connecting}</p>
		</div>
	</div>

	{#if displayCancel}
		<div class="mt-8" in:fade>
			<ButtonGroup>
				<button
					class="secondary block flex-1"
					on:click={() => dispatch('icCancel')}
					disabled={$isBusy || $addressNotCertified}>{$i18n.core.text.cancel}</button
				>
			</ButtonGroup>
		</div>
	{/if}
{/if}
