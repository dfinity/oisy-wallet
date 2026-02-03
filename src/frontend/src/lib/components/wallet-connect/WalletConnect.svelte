<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import {  untrack } from 'svelte';
	import {  walletConnectReconnecting } from '$eth/stores/wallet-connect.store';
	import WalletConnectButton from '$lib/components/wallet-connect/WalletConnectButton.svelte';
	import { TRACK_COUNT_WALLET_CONNECT_MENU_OPEN } from '$lib/constants/analytics.constants';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { disconnectListener } from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsShow } from '$lib/stores/toasts.store';
	import { walletConnectListenerStore as listenerStore } from '$lib/stores/wallet-connect.store';

	let listener = $derived($listenerStore);

	const modalId = Symbol();

	const disconnect = async () => {
		await disconnectListener();

		toastsShow({
			text: $i18n.wallet_connect.info.disconnected,
			level: 'info',
			duration: 2000
		});
	};

	$effect(() => {
		if ($authNotSignedIn) {
			untrack(() => disconnectListener());
		}
	});

	const openWalletConnectAuth = () => {
		modalStore.openWalletConnectAuth(modalId);

		trackEvent({
			name: TRACK_COUNT_WALLET_CONNECT_MENU_OPEN
		});
	};
</script>

{#if nonNullish(listener)}
	<WalletConnectButton onclick={disconnect}>
		{$i18n.wallet_connect.text.disconnect}
	</WalletConnectButton>
{:else}
	<WalletConnectButton
		ariaLabel={$i18n.wallet_connect.text.name}
		loading={$walletConnectReconnecting}
		onclick={openWalletConnectAuth}
	/>
{/if}
