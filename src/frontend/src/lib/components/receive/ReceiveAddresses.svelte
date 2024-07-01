<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store.js';
	import { i18n } from '$lib/stores/i18n.store.js';
	import { createEventDispatcher } from 'svelte';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import Card from '$lib/components/ui/Card.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import { ICP_TOKEN } from '$env/tokens.env';
	import ReceiveActions from '$lib/components/receive/ReceiveActions.svelte';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import ReceiveAddressWithLogo from '$lib/components/receive/ReceiveAddressWithLogo.svelte';

	const dispatch = createEventDispatcher();

	const displayQRCode = (addressType: string) => dispatch('icQRCode', addressType);
</script>

<div class="stretch">
	<ReceiveAddressWithLogo
		on:click={() => displayQRCode($icrcAccountIdentifierText ?? '')}
		address={$icrcAccountIdentifierText ?? ''}
		addressLabel={$i18n.receive.icp.text.icp_principal}
		token={ICP_TOKEN}
		qrCodeAriaLabel={$i18n.receive.icp.text.display_icp_principal_qr}
		copyAriaLabel={$i18n.receive.icp.text.icp_principal_copied}
	/>
</div>

<button class="primary full center text-center" on:click={modalStore.close}
	>{$i18n.core.text.done}</button
>
