<script lang="ts">
	import { icpAccountIdentifierText, icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { createEventDispatcher, getContext } from 'svelte';
	import ReceiveAddress from '$icp-eth/components/receive/ReceiveAddress.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';

	const { close } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	const displayQRCode = (addressType: string) => dispatch('icQRCode', addressType);
</script>

<div class="stretch">
	<ReceiveAddress
		labelRef="wallet-address"
		address={$icrcAccountIdentifierText ?? ''}
		qrCodeAriaLabel={$i18n.wallet.text.display_wallet_address_qr}
		copyAriaLabel={$i18n.wallet.text.wallet_address_copied}
		on:click={() => displayQRCode($icrcAccountIdentifierText ?? '')}
	>
		<svelte:fragment slot="title">{$i18n.wallet.text.wallet_address}</svelte:fragment>
		<svelte:fragment slot="text">{$i18n.receive.icp.text.use_for_all_tokens}</svelte:fragment>
	</ReceiveAddress>

	<div class="mb-6">
		<Hr />
	</div>

	<ReceiveAddress
		labelRef="icp-account-id"
		address={$icpAccountIdentifierText ?? ''}
		qrCodeAriaLabel={$i18n.receive.icp.text.display_account_id_qr}
		copyAriaLabel={$i18n.receive.icp.text.account_id_copied}
		on:click={() => displayQRCode($icpAccountIdentifierText ?? '')}
	>
		<svelte:fragment slot="title">{$i18n.receive.icp.text.account_id}</svelte:fragment>
		<svelte:fragment slot="text">{$i18n.receive.icp.text.use_for_deposit}</svelte:fragment>
	</ReceiveAddress>
</div>

<button class="primary full center text-center" on:click={close}>{$i18n.core.text.done}</button>
