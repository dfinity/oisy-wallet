<script lang="ts">
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import ReceiveAddress from '$icp-eth/components/receive/ReceiveAddress.svelte';
	import { createEventDispatcher, getContext } from 'svelte';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';

	const { token } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	const displayQRCode = (addressType: string) => dispatch('icQRCode', addressType);
</script>

<ReceiveAddress
	labelRef="wallet-address"
	address={$icrcAccountIdentifierText ?? ''}
	qrCodeAriaLabel={$i18n.wallet.text.display_wallet_address_qr}
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
