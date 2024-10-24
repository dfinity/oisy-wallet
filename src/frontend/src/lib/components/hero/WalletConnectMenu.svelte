<script>
	import { walletConnectPaired } from '$eth/stores/wallet-connect.store';
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { TRACK_COUNT_WALLET_CONNECT_MENU_OPEN } from '$lib/constants/analytics.contants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	const openWalletConnectAuth = async () => {
		modalStore.openWalletConnectAuth();

		await trackEvent({
			name: TRACK_COUNT_WALLET_CONNECT_MENU_OPEN
		});
	};
</script>

<ButtonIcon
	ariaLabel={$i18n.wallet_connect.text.name}
	on:click={openWalletConnectAuth}
	disabled={$walletConnectPaired}
>
	<IconWalletConnect size="22" slot="icon" />
</ButtonIcon>
