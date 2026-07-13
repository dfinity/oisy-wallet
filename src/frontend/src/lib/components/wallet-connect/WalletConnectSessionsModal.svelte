<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { SessionTypes } from '@walletconnect/types';
	import { onMount } from 'svelte';
	import { CAIP10_CHAINS } from '$env/caip10-chains.env';
	import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
	import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
	import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
	import IconLinkOff from '$lib/components/icons/IconLinkOff.svelte';
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import OverlappedLogos from '$lib/components/ui/OverlappedLogos.svelte';
	import {
		disconnectListener,
		disconnectSession,
		syncSessions
	} from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsShow } from '$lib/stores/toasts.store';
	import { walletConnectSessionsStore } from '$lib/stores/wallet-connect.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { SolanaNetworks } from '$sol/types/network';

	const chainIconMap: Record<string, string> = {
		...[...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS].reduce<Record<string, string>>(
			(acc, { chainId, icon }) =>
				nonNullish(icon) ? { ...acc, [`eip155:${chainId}`]: icon } : acc,
			{}
		),
		...Object.entries(CAIP10_CHAINS).reduce<Record<string, string>>((acc, [key, { network }]) => {
			const { icon } =
				network === SolanaNetworks.mainnet ? SOLANA_MAINNET_NETWORK : SOLANA_DEVNET_NETWORK;
			return nonNullish(icon) ? { ...acc, [key]: icon } : acc;
		}, {})
	};

	let sessions = $derived($walletConnectSessionsStore);

	// Reflect the live WalletKit sessions whenever the modal is opened, independent of which add /
	// remove path last ran.
	onMount(syncSessions);

	const showDisconnectedToast = () =>
		toastsShow({
			text: $i18n.wallet_connect.info.disconnected,
			level: 'info',
			duration: 2000
		});

	// Disconnect a single dApp by topic; the list updates in place and the other dApps stay connected.
	// The service catches its own errors, so only surface the success toast when it actually succeeded.
	const disconnectOne = async (topic: string) => {
		const { success } = await disconnectSession(topic);

		if (success) {
			showDisconnectedToast();
		}
	};

	// Tear down every connection at once, preserving the previous one-tap teardown behaviour.
	const disconnectAll = async () => {
		await disconnectListener();

		showDisconnectedToast();

		modalStore.close();
	};

	const getSessionDetails = (session: SessionTypes.Struct) =>
		Object.values(session.namespaces)
			.flatMap((ns) => ns.accounts)
			.reduce<{ networkIcons: string[] }>(
				(acc, account) => {
					const [namespace, reference] = account.split(':');

					const icon = chainIconMap[`${namespace}:${reference}`];

					if (nonNullish(icon) && !acc.networkIcons.includes(icon)) {
						acc.networkIcons.push(icon);
					}
					return acc;
				},
				{ networkIcons: [] }
			);
</script>

<Modal onClose={modalStore.close}>
	{#snippet title()}
		{$i18n.wallet_connect.text.wallet_connect}
	{/snippet}

	<ContentWithToolbar>
		<h4 class="mb-4">{$i18n.wallet_connect.text.connected_apps}</h4>

		{#if sessions.length === 0}
			<p class="text-secondary">{$i18n.wallet_connect.text.no_connected_apps}</p>
		{:else}
			<div class="flex flex-col gap-4">
				{#each sessions as session (session.topic)}
					{@const { name, url } = session.peer.metadata}
					{@const { networkIcons } = getSessionDetails(session)}

					<LogoButton hover={false} styleClass="bg-secondary rounded-xl border border-disabled">
						{#snippet logo()}
							<div
								class="mr-2 flex size-[40px] items-center justify-center rounded-full bg-tertiary"
							>
								<IconWalletConnect size="24" />
							</div>
						{/snippet}

						{#snippet title()}
							{name}
						{/snippet}

						{#snippet subtitle()}
							<OverlappedLogos icons={networkIcons} styleClass="ml-2" />
						{/snippet}

						{#snippet description()}
							<ExternalLink
								ariaLabel={name}
								href={url}
								iconVisible={false}
								styleClass="text-primary"
							>
								{url}
							</ExternalLink>
						{/snippet}

						{#snippet action()}
							<Button
								ariaLabel={replacePlaceholders($i18n.wallet_connect.text.disconnect_app, {
									$name: name
								})}
								colorStyle="error"
								onclick={() => disconnectOne(session.topic)}
								paddingSmall
								testId={`wallet-connect-disconnect-session-${session.topic}`}
								transparent
								type="button"
							>
								<IconLinkOff />
							</Button>
						{/snippet}
					</LogoButton>
				{/each}
			</div>
		{/if}

		{#snippet toolbar()}
			<ButtonGroup>
				{#if sessions.length > 0}
					<Button
						colorStyle="error"
						onclick={disconnectAll}
						testId="wallet-connect-disconnect-all"
						type="button"
					>
						{$i18n.wallet_connect.text.disconnect_all}
					</Button>
				{/if}
				<ButtonCloseModal />
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</Modal>
