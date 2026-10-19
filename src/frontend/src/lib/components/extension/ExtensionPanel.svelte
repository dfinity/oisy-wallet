<script lang="ts">
	import { onMount } from 'svelte';
	import LockPage from '$lib/components/auth/LockPage.svelte';
	import ExtensionLoaders from '$lib/components/extension/ExtensionLoaders.svelte';
	import ExtensionPanelContent from '$lib/components/extension/ExtensionPanelContent.svelte';
	import ExtensionSignIn from '$lib/components/extension/ExtensionSignIn.svelte';
	import ExtensionWalletSnapshot from '$lib/components/extension/ExtensionWalletSnapshot.svelte';
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
	{#if snapshot !== undefined}
		<div class="flex justify-center"><OisyWalletLogo /></div>

		{#if snapshot === null}
			<ExtensionSignIn />
		{:else}
			<ExtensionWalletSnapshot {snapshot} />
		{/if}
	{/if}
{:else}
	<ExtensionLoaders walletOverview>
		<ExtensionPanelContent />
	</ExtensionLoaders>
{/if}
