<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
	import { SOLANA_DEVNET_TOKEN_ID } from '$env/tokens/tokens.sol.env';
	import ExtensionPanelHeader from '$lib/components/extension/ExtensionPanelHeader.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import {
		OISY_EXTENSION_KEEP_ALIVE_MS,
		OISY_EXTENSION_PANEL_PORT_NAME,
		OISY_EXTENSION_PANEL_RECONNECT_ATTEMPTS,
		OISY_EXTENSION_PANEL_STATE_TIMEOUT_MS
	} from '$lib/constants/extension.constants';
	import { extensionAccount, extensionNetworksOn } from '$lib/derived/extension.derived';
	import { enabledFungibleNetworkTokensUi } from '$lib/derived/network-tokens-ui.derived';
	import { connectExtension } from '$lib/providers/extension.providers';
	import { ExtensionPanelStateMessageSchema } from '$lib/schema/extension.schema';
	import { signOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type {
		ExtensionOutgoingMessage,
		ExtensionPanelState,
		ExtensionPort,
		ExtensionVersionStatus
	} from '$lib/types/extension';
	import { extensionVersionStatus } from '$lib/utils/extension.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

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

	// Sites only ever see the Sepolia and Solana devnet addresses, so those are the balances that matter
	// here; the rest is one click away in OISY.
	let tokens = $derived(
		$enabledFungibleNetworkTokensUi.filter(
			({ id }) => id === SEPOLIA_TOKEN_ID || id === SOLANA_DEVNET_TOKEN_ID
		)
	);

	const disconnect = (origin: string) => send({ type: 'revoke-site', origin });

	const disconnectAll = () => send({ type: 'revoke-all-sites' });

	// The panel shares OISY's session, so logging out here logs out OISY tabs too. The extension is
	// locked first, so sites lose the account even if the reload that follows is quick.
	const logOut = async () => {
		send({ type: 'lock' });
		await signOut({ source: 'extension-panel' });
	};
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
		<ExtensionPanelHeader
			address={$extensionAccount?.eth}
			onDisconnectAll={disconnectAll}
			onLogOut={logOut}
		/>

		{#if !$extensionNetworksOn}
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
					<p class="truncate font-bold" title={origin}>{host}</p>
					<p
						class="text-sm"
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

		<section class="flex flex-col gap-2">
			<h2 class="text-base font-bold">
				{replacePlaceholders($i18n.extension.panel.connected_sites_count, {
					$count: `${sites.length}`
				})}
			</h2>

			{#if sites.length === 0}
				<p class="text-sm text-tertiary">{$i18n.extension.panel.no_sites}</p>
			{:else}
				<ul class="flex list-none flex-col">
					{#each sites as { origin, host, chains } (origin)}
						<li
							class="flex items-center justify-between gap-3 border-b border-secondary py-2 last:border-b-0"
						>
							<div class="min-w-0">
								<p class="truncate text-sm font-bold" title={origin}>{host}</p>
								<p class="text-xs text-tertiary">{chains}</p>
							</div>

							{@render disconnectButton({ origin, host })}
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="flex flex-col gap-2">
			<h2 class="text-base font-bold">{$i18n.extension.panel.balances}</h2>

			<div class="flex flex-col">
				{#each tokens as token (token.id)}
					<TokenCard data={token} />
				{/each}
			</div>

			<div class="flex justify-center">
				<ExternalLink ariaLabel={$i18n.extension.panel.all_tokens} href={page.url.origin}>
					{$i18n.extension.panel.all_tokens}
				</ExternalLink>
			</div>
		</section>
	{/if}
</div>
