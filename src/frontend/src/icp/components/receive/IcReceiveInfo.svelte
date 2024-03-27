<script lang="ts">
	import { icpAccountIdentifierText, icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { createEventDispatcher } from 'svelte';
	import ReceiveAddress from '$icp-eth/components/receive/ReceiveAddress.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	const dispatch = createEventDispatcher();

	const displayQRCode = (addressType: string) => dispatch('icQRCode', addressType);
</script>

<ReceiveAddress
	labelRef="wallet-address"
	address={$icrcAccountIdentifierText ?? ''}
	qrCodeAriaLabel={$i18n.receive.icp.text.display_wallet_address_qr}
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

<button class="primary full center text-center mt-8 mb-6" on:click={modalStore.close}
	>{$i18n.core.text.done}</button
>
