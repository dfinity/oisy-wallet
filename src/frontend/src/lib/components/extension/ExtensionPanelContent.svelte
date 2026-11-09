<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import ExtensionPanelHeader from '$lib/components/extension/ExtensionPanelHeader.svelte';
	import ExtensionRecentActivity from '$lib/components/extension/ExtensionRecentActivity.svelte';
	import ExtensionWalletAssets from '$lib/components/extension/ExtensionWalletAssets.svelte';
	import ExtensionWalletBalance from '$lib/components/extension/ExtensionWalletBalance.svelte';
	import ExtensionWalletSnapshot from '$lib/components/extension/ExtensionWalletSnapshot.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Collapsible from '$lib/components/ui/Collapsible.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import {
		OISY_EXTENSION_KEEP_ALIVE_MS,
		OISY_EXTENSION_PANEL_PORT_NAME,
		OISY_EXTENSION_PANEL_RECONNECT_ATTEMPTS,
		OISY_EXTENSION_PANEL_STATE_TIMEOUT_MS
	} from '$lib/constants/extension.constants';
	import { extensionAccount, extensionNetworksOn } from '$lib/derived/extension.derived';
	import { connectExtension } from '$lib/providers/extension.providers';
	import { ExtensionPanelStateMessageSchema } from '$lib/schema/extension.schema';
	import { signOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type {
		ExtensionOutgoingMessage,
		ExtensionPanelSnapshot,
		ExtensionPanelState,
		ExtensionPort,
		ExtensionVersionStatus
	} from '$lib/types/extension';
	import { extensionVersionStatus } from '$lib/utils/extension.utils';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		// After the session ends: the wallet as last saved, in place of the live sections. The rest of
		// the panel needs no session.
		snapshot?: ExtensionPanelSnapshot;
	}

	let { snapshot }: Props = $props();

	let port: ExtensionPort | undefined;

	let reachable = $state(true);
	let extensionState = $state<ExtensionPanelState | undefined>();
	let versionStatus = $state<ExtensionVersionStatus | undefined>();

	const send = (message: ExtensionOutgoingMessage) => {
		try {
			port?.postMessage(message);
		} catch (_: unknown) {
			port = undefined;
		}
	};

	// Disconnects since the extension last answered. A missing or disabled extension drops every new
	// port at once, so a few in a row mean it is really gone.
	let failedConnects = 0;

	const connect = () => {
		const next = connectExtension({ name: OISY_EXTENSION_PANEL_PORT_NAME });

		if (isNullish(next)) {
			reachable = false;
			return;
		}

		port = next;

		next.onMessage.addListener((message) => {
			const parsed = ExtensionPanelStateMessageSchema.safeParse(message);

			if (!parsed.success) {
				return;
			}

			failedConnects = 0;
			extensionState = parsed.data.state;
			versionStatus = extensionVersionStatus({ version: parsed.data.version });
		});

		// Chrome stops the extension's worker when it has nothing to do and closes its ports. A new port
		// starts the worker again, so the panel reconnects before it calls the extension unreachable.
		next.onDisconnect.addListener(() => {
			if (port !== next) {
				return;
			}

			port = undefined;
			failedConnects++;

			if (failedConnects > OISY_EXTENSION_PANEL_RECONNECT_ATTEMPTS) {
				reachable = false;
				return;
			}

			connect();
		});

		send({ type: 'get-state' });
	};

	onMount(() => {
		connect();

		// Pings keep the worker awake while the panel is open, so the state it pushes arrives at once.
		const keepAlive = setInterval(() => send({ type: 'ping' }), OISY_EXTENSION_KEEP_ALIVE_MS);

		// An extension that never answers predates the panel; without this the panel would show an
		// empty list as if nothing were connected.
		const stateTimeout = setTimeout(() => {
			if (reachable && isNullish(extensionState)) {
				versionStatus = 'outdated';
			}
		}, OISY_EXTENSION_PANEL_STATE_TIMEOUT_MS);

		return () => {
			clearInterval(keepAlive);
			clearTimeout(stateTimeout);
			port?.disconnect();
		};
	});

	// The panel is OISY itself, so once signed in it hands the extension the account directly; there is
	// no separate pairing step.
	$effect(() => {
		const account = $extensionAccount;

		if (versionStatus !== 'supported' || isNullish(account) || isNullish(extensionState)) {
			return;
		}

		const stored = extensionState.account;

		// Signing in again after logging out from the panel hands the same account back, which unlocks
		// the extension.
		if (
			stored?.eth === account.eth &&
			stored?.sol === account.sol &&
			extensionState.locked !== true
		) {
			return;
		}

		send({ type: 'set-account', account });
	});

	const hostOf = (origin: string): string => {
		try {
			return new URL(origin).host;
		} catch (_: unknown) {
			return origin;
		}
	};

	let sites = $derived(
		Object.entries(extensionState?.sites ?? {})
			.filter(([, { eth, sol }]) => eth || sol)
			.map(([origin, { eth, sol }]) => ({
				origin,
				host: hostOf(origin),
				chains: [
					eth ? $i18n.extension.panel.chain_eth : undefined,
					sol ? $i18n.extension.panel.chain_sol : undefined
				]
					.filter(nonNullish)
					.join(' · ')
			}))
	);

	let activeOrigin = $derived(extensionState?.activeOrigin ?? undefined);

	let thisSite = $derived(
		nonNullish(activeOrigin)
			? (sites.find(({ origin }) => origin === activeOrigin) ?? {
					origin: activeOrigin,
					host: hostOf(activeOrigin),
					chains: undefined
				})
			: undefined
	);

	const disconnect = (origin: string) => send({ type: 'revoke-site', origin });

	const disconnectAll = () => send({ type: 'revoke-all-sites' });

	// The panel shares OISY's session, so logging out here logs out OISY tabs too. The extension is
	// locked first, so sites lose the account even if the reload that follows is quick.
	// Unmounting the wallet sections first cancels a pending snapshot, which logging out deletes.
	let loggingOut = $state(false);

	const logOut = async () => {
		loggingOut = true;
		send({ type: 'lock' });
		await signOut({ source: 'extension-panel' });
	};

	// The addresses sites can see: the extension offers only these two test networks. Taken from the
	// extension, which keeps them after the session ends.
	let siteAccount = $derived(extensionState?.account ?? $extensionAccount);

	let addresses = $derived(
		[
			{ chain: $i18n.extension.panel.chain_eth, address: siteAccount?.eth },
			{ chain: $i18n.extension.panel.chain_sol, address: siteAccount?.sol }
		].filter((entry): entry is { chain: string; address: string } => nonNullish(entry.address))
	);
</script>

{#snippet disconnectButton({ origin, host }: { origin: string; host: string })}
	<Button
		ariaLabel={replacePlaceholders($i18n.extension.panel.disconnect_site, { $origin: host })}
		inlineLink
		link
		onclick={() => disconnect(origin)}
		styleClass="shrink-0 text-sm"
		type="button"
	>
		{$i18n.extension.panel.disconnect}
	</Button>
{/snippet}

<div class="flex w-full flex-col gap-6">
	{#if !reachable}
		<MessageBox level="error">{$i18n.extension.text.no_extension}</MessageBox>
	{:else if nonNullish(versionStatus) && versionStatus !== 'supported'}
		<MessageBox level="warning">{$i18n.extension.text.outdated}</MessageBox>
	{:else}
		<ExtensionPanelHeader onDisconnectAll={disconnectAll} onLogOut={logOut} />

		<!-- Signed out, OISY has no network settings to read, so there is nothing to warn about. -->
		{#if isNullish(snapshot) && !$extensionNetworksOn}
			<MessageBox level="warning">{$i18n.extension.text.networks_off}</MessageBox>
		{/if}

		{#if nonNullish(thisSite)}
			{@const { origin, host, chains } = thisSite}
			{@const connected = nonNullish(chains)}

			<section
				class="flex items-center justify-between gap-3 rounded-lg px-4 py-3"
				class:bg-brand-subtle-20={!connected}
				class:bg-success-subtle-20={connected}
				data-tid="extension-this-site"
			>
				<div class="min-w-0">
					<p class="m-0 truncate font-bold" title={origin}>{host}</p>
					<p
						class="m-0 text-sm"
						class:text-success-primary={connected}
						class:text-tertiary={!connected}
					>
						{connected
							? replacePlaceholders($i18n.extension.panel.this_site_connected, { $chains: chains })
							: $i18n.extension.panel.this_site_not_connected}
					</p>
				</div>

				{#if connected}
					{@render disconnectButton({ origin, host })}
				{/if}
			</section>
		{/if}

		{#if loggingOut}
			<!-- Nothing: unmounting cancels a pending snapshot, which logging out deletes. -->
		{:else if nonNullish(snapshot)}
			<ExtensionWalletSnapshot {snapshot} />
		{:else}
			<ExtensionWalletBalance />

			<ExtensionWalletAssets />

			<ExtensionRecentActivity />
		{/if}

		<Collapsible testId="extension-connected-sites">
			{#snippet header()}
				<h2 class="text-base font-bold">
					{replacePlaceholders($i18n.extension.panel.connected_sites_count, {
						$count: `${sites.length}`
					})}
				</h2>
			{/snippet}

			<div class="flex flex-col gap-4 pb-2">
				{#if addresses.length > 0}
					<div class="flex flex-col gap-1">
						<p class="m-0 text-sm text-tertiary">{$i18n.extension.panel.addresses_sites_see}</p>

						{#each addresses as { chain, address } (chain)}
							<div class="flex items-center justify-between gap-3">
								<span class="text-sm">{chain}</span>

								<span class="flex min-w-0 items-center gap-1">
									<span class="font-mono truncate text-sm" title={address}
										>{shortenWithMiddleEllipsis({ text: address, splitLength: 6 })}</span
									>
									<Copy inline text={$i18n.wallet.text.address_copied} value={address} />
								</span>
							</div>
						{/each}
					</div>
				{/if}

				{#if sites.length === 0}
					<p class="m-0 text-sm text-tertiary">{$i18n.extension.panel.no_sites}</p>
				{:else}
					<ul class="flex list-none flex-col">
						{#each sites as { origin, host, chains } (origin)}
							<li
								class="flex items-center justify-between gap-3 border-b border-secondary py-2 last:border-b-0"
							>
								<div class="min-w-0">
									<p class="m-0 truncate text-sm font-bold" title={origin}>{host}</p>
									<p class="m-0 text-xs text-tertiary">{chains}</p>
								</div>

								{@render disconnectButton({ origin, host })}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</Collapsible>
	{/if}
</div>
