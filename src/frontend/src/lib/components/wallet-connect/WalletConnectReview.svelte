<script lang="ts">
	import { Spinner } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import type { ProposalTypes } from '@walletconnect/types';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { EIP155_CHAINS } from '$env/eip155-chains.env';
	import { acceptedContext } from '$eth/utils/wallet-connect.utils';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectDomainVerification from '$lib/components/wallet-connect/WalletConnectDomainVerification.svelte';
	import { ethAddressNotCertified } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Option } from '$lib/types/utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let proposal: Option<WalletKitTypes.SessionProposal>;

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

		clearTimeout(timer);
		timer = undefined;
	});
</script>

{#if nonNullish(proposal) && nonNullish(params)}
	<ContentWithToolbar>
		<p class="mb-0 font-bold">
			{$i18n.wallet_connect.text.proposer}: {params.proposer.metadata.name}
		</p>
		<p class="mb-0">{params.proposer.metadata.description}</p>
		<a href={params.proposer.metadata.url} rel="external noopener noreferrer" target="_blank"
			>{params.proposer.metadata.url}</a
		>

		<WalletConnectDomainVerification {proposal} />

		{#each Object.entries(params.requiredNamespaces) as [key, value] (key)}
			{@const allMethods = value.methods}
			{@const allEvents = value.events}

			{#each value.chains ?? [] as chainId (chainId)}
				{@const chainName = EIP155_CHAINS[chainId]?.name ?? ''}

				<p class="mt-6 font-bold">
					{replacePlaceholders($i18n.wallet_connect.text.review, {
						$chain_name: chainName,
						$key: key
					})}:
				</p>

				<article class="rounded-xs mt-4 bg-disabled p-4">
					<p class="font-bold">{$i18n.wallet_connect.text.methods}:</p>

					<p>{allMethods.length ? allMethods.join(', ') : '-'}</p>

					<p class="mt-4 font-bold">{$i18n.wallet_connect.text.events}:</p>

					<p>{allEvents.length ? allEvents.join(', ') : '-'}</p>
				</article>
			{/each}
		{/each}

		{#snippet toolbar()}
			<div in:fade>
				<WalletConnectActions {approve} on:icApprove on:icReject />
			</div>
		{/snippet}
	</ContentWithToolbar>
{:else}
	<ContentWithToolbar>
		<div class="stretch">
			<div class="flex h-[100%] min-h-[30vh] flex-col items-center justify-center gap-2 pt-8">
				<div>
					<Spinner inline />
				</div>
				<p>{$i18n.wallet_connect.text.connecting}</p>
			</div>
		</div>

		{#snippet toolbar()}
			{#if displayCancel}
				<div in:fade>
					<ButtonGroup>
						<ButtonCancel
							onclick={() => dispatch('icCancel')}
							disabled={$isBusy || $ethAddressNotCertified}
						/>
					</ButtonGroup>
				</div>
			{/if}
		{/snippet}
	</ContentWithToolbar>
{/if}
