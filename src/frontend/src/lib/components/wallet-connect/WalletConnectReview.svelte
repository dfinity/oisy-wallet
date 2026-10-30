<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { onDestroy, onMount } from 'svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import LoaderSpinner from '$lib/components/ui/LoaderSpinner.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectDomainVerification from '$lib/components/wallet-connect/WalletConnectDomainVerification.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { resetListenerIfNoSessions, syncSessions } from '$lib/services/wallet-connect.services';
	import { busy } from '$lib/stores/busy.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import {
		walletConnectListenerStore,
		walletConnectProposalStore
	} from '$lib/stores/wallet-connect.store';
	import { fade } from '$lib/utils/transitions.utils';
	import { acceptedContext, getWalletConnectChainName } from '$lib/utils/wallet-connect.utils';

	let listener = $derived($walletConnectListenerStore);

	let proposal = $derived($walletConnectProposalStore);

	let params = $derived(proposal?.params);

	let approve = $derived(acceptedContext(proposal?.verifyContext));

	// What approving grants, worked out exactly as `approveSession` will, rather than read off the
	// proposal: current WalletConnect SDKs send every namespace a dApp asks for as optional, and OISY
	// grants only the networks and methods it supports. Working it out throws when the proposal
	// requires something OISY does not support; approving fails then too, so nothing is listed.
	let grantedNamespaces = $derived.by(() => {
		if (isNullish(listener) || isNullish(proposal)) {
			return [];
		}

		try {
			return Object.entries(listener.approvedNamespaces(proposal)).map(
				([key, { chains, methods, events }]) => ({
					key,
					// A dApp can ask for a network under two chain IDs (Solana's legacy one, say), which
					// is one network to the user.
					networks: [...new Set((chains ?? []).map(getWalletConnectChainName))],
					methods,
					events
				})
			);
		} catch (_: unknown) {
			return [];
		}
	});

	// Display a cancel button after a while if the WalletConnect initialization never resolves
	let timer = $state<NodeJS.Timeout | undefined>();
	let displayCancel = $state(false);

	onMount(() => (timer = setTimeout(() => (displayCancel = true), 2000)));

	onDestroy(() => {
		if (isNullish(timer)) {
			return;
		}

		clearTimeout(timer);
		timer = undefined;
	});

	const close = () => modalStore.close();

	const resetAndClose = () => {
		// Rejecting a proposal must not drop dApps already connected — keep the listener if any remain.
		resetListenerIfNoSessions();
		close();
	};

	const answer = async ({
		callback,
		toast
	}: {
		callback: ((proposal: WalletKitTypes.SessionProposal) => Promise<void>) | undefined;
		toast?: () => void;
	}) => {
		if (isNullish(listener) || isNullish(callback)) {
			toastsError({
				msg: { text: $i18n.wallet_connect.error.no_connection_opened }
			});

			close();
			return;
		}

		if (isNullish(proposal)) {
			toastsError({
				msg: { text: $i18n.wallet_connect.error.no_session_approval }
			});

			close();
			return;
		}

		busy.start();

		try {
			await callback(proposal);

			// Reflect the newly approved (or removed) session in the reactive sessions store.
			syncSessions();

			toast?.();
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.wallet_connect.error.unexpected },
				err
			});

			resetListenerIfNoSessions();
		}

		busy.stop();

		close();
	};

	const onApprove = async () => {
		// A new proposal replaces the one under review, so the click is held to the proposal it would
		// approve rather than to the button rendered for the previous one.
		if (!acceptedContext(proposal?.verifyContext)) {
			return;
		}

		await answer({
			callback: listener?.approveSession,
			toast: () =>
				toastsShow({
					text: $i18n.wallet_connect.info.connected,
					level: 'success',
					duration: 2000
				})
		});
	};

	const onReject = async () =>
		await answer({
			callback: async () => {
				if (nonNullish(proposal)) {
					await listener?.rejectSession(proposal);
				}

				resetAndClose();
			}
		});

	const onCancel = async () => {
		await onReject();
	};
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

		{#if grantedNamespaces.length > 0}
			<p class="mt-6 font-bold">{$i18n.wallet_connect.text.granted_permissions}:</p>

			{#each grantedNamespaces as { key, networks, methods, events } (key)}
				<article
					class="mt-4 rounded-xs bg-disabled p-4"
					data-tid="wallet-connect-granted-namespace"
				>
					<p class="font-bold">{$i18n.wallet_connect.text.networks}:</p>

					<p>{networks.length ? networks.join(', ') : '-'}</p>

					<p class="mt-4 font-bold">{$i18n.wallet_connect.text.methods}:</p>

					<p>{methods.length ? methods.join(', ') : '-'}</p>

					<p class="mt-4 font-bold">{$i18n.wallet_connect.text.events}:</p>

					<p>{events.length ? events.join(', ') : '-'}</p>
				</article>
			{/each}
		{/if}

		{#snippet toolbar()}
			<div in:fade>
				<WalletConnectActions {approve} {onApprove} {onReject} />
			</div>
		{/snippet}
	</ContentWithToolbar>
{:else}
	<ContentWithToolbar>
		<div class="stretch">
			<div class="flex h-[100%] min-h-[30vh] flex-col items-center justify-center gap-2 pt-8">
				<div>
					<LoaderSpinner inline />
				</div>
				<p>{$i18n.wallet_connect.text.connecting}</p>
			</div>
		</div>

		{#snippet toolbar()}
			{#if displayCancel}
				<div in:fade>
					<ButtonGroup>
						<ButtonCancel disabled={$isBusy} onclick={onCancel} />
					</ButtonGroup>
				</div>
			{/if}
		{/snippet}
	</ContentWithToolbar>
{/if}
