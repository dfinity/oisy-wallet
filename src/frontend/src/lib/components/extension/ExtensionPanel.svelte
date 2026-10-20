<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import LockPage from '$lib/components/auth/LockPage.svelte';
	import ExtensionLoaders from '$lib/components/extension/ExtensionLoaders.svelte';
	import ExtensionPanelContent from '$lib/components/extension/ExtensionPanelContent.svelte';
	import ExtensionSignIn from '$lib/components/extension/ExtensionSignIn.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { isAuthLocked } from '$lib/derived/locked.derived';
	import { announcePanelReady } from '$lib/providers/extension.providers';
	import { loadExtensionPanelSnapshot } from '$lib/services/extension-panel.services';
	import type { ExtensionPanelSnapshot } from '$lib/types/extension';

	// `undefined` while reading, `null` when there is none. Raw, because its price lookups are posted
	// to OISY's price worker, and a deeply reactive copy can't be cloned into a worker.
	let snapshot = $state.raw<ExtensionPanelSnapshot | null | undefined>();

	onMount(async () => {
		announcePanelReady();
		snapshot = await loadExtensionPanelSnapshot();
	});
</script>

{#if $isAuthLocked}
	<!-- Locking OISY hides the wallet, so the panel shows nothing of it either. -->
	<LockPage />
{:else if $authNotSignedIn}
	{#if snapshot === null}
		<div class="flex justify-center"><OisyWalletLogo /></div>

		<ExtensionSignIn />
	{:else if nonNullish(snapshot)}
		<!-- The same panel as signed in, with the saved wallet: sites, addresses and the menu need no session. -->
		<ExtensionPanelContent {snapshot} />
	{/if}
{:else}
	<ExtensionLoaders walletOverview>
		<ExtensionPanelContent />
	</ExtensionLoaders>
{/if}
