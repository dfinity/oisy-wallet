<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import { ICP_NETWORK } from '$env/networks.env';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';
	import ReceiveAddress from '$lib/components/receive/ReceiveAddress.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	const { token } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	const displayQRCode = (address: string) =>
		dispatch('icQRCode', {
			address,
			addressLabel: $i18n.wallet.text.wallet_address,
			addressToken: $token,
			copyAriaLabel: $i18n.wallet.text.wallet_address_copied
		});
</script>

<ReceiveAddress
	labelRef="wallet-address"
	address={$icrcAccountIdentifierText ?? ''}
	network={ICP_NETWORK}
	qrCodeAction={{
		enabled: true,
		ariaLabel: $i18n.wallet.text.display_wallet_address_qr
	}}
	copyAriaLabel={$i18n.wallet.text.wallet_address_copied}
	on:click={() => displayQRCode($icrcAccountIdentifierText ?? '')}
>
	<svelte:fragment slot="title">{$i18n.wallet.text.wallet_address}</svelte:fragment>
	<svelte:fragment slot="text"
		>{replacePlaceholders($i18n.wallet.text.use_address_from_to, {
			$token: $token.symbol
		})}</svelte:fragment
	>
</ReceiveAddress>
