<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { createEventDispatcher } from 'svelte';
	import { icpAccountIdentifierText, icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
	import ReceiveAddressWithLogo from '$lib/components/receive/ReceiveAddressWithLogo.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import Hr from '$lib/components/ui/Hr.svelte';

	const dispatch = createEventDispatcher();

	const displayQRCode = (details: { address: string; addressLabel: string }) =>
		dispatch('icQRCode', details);
</script>

<div class="stretch">
	<ReceiveAddressWithLogo
		on:click={() =>
			displayQRCode({
				address: $icrcAccountIdentifierText ?? '',
				addressLabel: $i18n.receive.icp.text.principal
			})}
		address={$icrcAccountIdentifierText ?? ''}
		token={ICP_TOKEN}
		qrCodeAriaLabel={$i18n.receive.icp.text.display_internet_computer_principal_qr}
		copyAriaLabel={$i18n.receive.icp.text.internet_computer_principal_copied}
	>
		{$i18n.receive.icp.text.principal}

		<p slot="notes" class="text-sm text-dark">{$i18n.receive.icp.text.use_for_icrc_deposit}</p>
	</ReceiveAddressWithLogo>

	<ReceiveAddressWithLogo
		on:click={() =>
			displayQRCode({
				address: $icpAccountIdentifierText ?? '',
				addressLabel: $i18n.receive.icp.text.icp_account
			})}
		address={$icpAccountIdentifierText ?? ''}
		token={ICP_TOKEN}
		qrCodeAriaLabel={$i18n.receive.icp.text.display_icp_account_qr}
		copyAriaLabel={$i18n.receive.icp.text.icp_account_copied}
		invisibleLogo
	>
		{$i18n.receive.icp.text.icp_account}

		<p slot="notes" class="text-sm text-dark">{$i18n.receive.icp.text.use_for_icp_deposit}</p>
	</ReceiveAddressWithLogo>

	<div class="mb-6">
		<Hr />
	</div>

	<ReceiveAddressWithLogo
		on:click={() =>
			displayQRCode({
				address: $ethAddress ?? '',
				addressLabel: $i18n.receive.ethereum.text.ethereum_address
			})}
		address={$ethAddress ?? ''}
		token={ETHEREUM_TOKEN}
		qrCodeAriaLabel={$i18n.receive.ethereum.text.display_ethereum_address_qr}
		copyAriaLabel={$i18n.receive.ethereum.text.ethereum_address_copied}
	>
		{$i18n.receive.ethereum.text.ethereum}
	</ReceiveAddressWithLogo>
</div>

<button class="primary full center text-center" on:click={modalStore.close}
	>{$i18n.core.text.done}</button
>
