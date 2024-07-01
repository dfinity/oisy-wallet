<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { createEventDispatcher } from 'svelte';
	import { icpAccountIdentifierText, icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
	import ReceiveAddressWithLogo from '$lib/components/receive/ReceiveAddressWithLogo.svelte';
	import { address } from '$lib/derived/address.derived';

	const dispatch = createEventDispatcher();

	const displayQRCode = (address: string) => dispatch('icQRCode', address);
</script>

<div class="stretch">
	<ReceiveAddressWithLogo
		on:click={() => displayQRCode($icrcAccountIdentifierText ?? '')}
		address={$icrcAccountIdentifierText ?? ''}
		token={ICP_TOKEN}
		qrCodeAriaLabel={$i18n.receive.icp.text.display_internet_computer_principal_qr}
		copyAriaLabel={$i18n.receive.icp.text.internet_computer_principal_copied}
	>
		{$i18n.receive.icp.text.internet_computer_principal}
	</ReceiveAddressWithLogo>

	<ReceiveAddressWithLogo
		on:click={() => displayQRCode($icpAccountIdentifierText ?? '')}
		address={$icpAccountIdentifierText ?? ''}
		token={ICP_TOKEN}
		qrCodeAriaLabel={$i18n.receive.icp.text.display_icp_account_qr}
		copyAriaLabel={$i18n.receive.icp.text.icp_account_copied}
	>
		{$i18n.receive.icp.text.icp_account}

		<p slot="notes" class="text-sm text-dark">{$i18n.receive.icp.text.icp_account_notes}</p>
	</ReceiveAddressWithLogo>

	<ReceiveAddressWithLogo
		on:click={() => displayQRCode($address ?? '')}
		address={$address ?? ''}
		token={ETHEREUM_TOKEN}
		qrCodeAriaLabel={$i18n.receive.ethereum.text.display_ethereum_address_qr}
		copyAriaLabel={$i18n.receive.ethereum.text.ethereum_address_copied}
	>
		{$i18n.receive.ethereum.text.ethereum_address}
	</ReceiveAddressWithLogo>
</div>

<button class="primary full center text-center" on:click={modalStore.close}
	>{$i18n.core.text.done}</button
>
