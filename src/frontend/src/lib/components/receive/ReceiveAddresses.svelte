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

	const dispatch = createEventDispatcher();

	const displayQRCode = (addressType: string) => dispatch('icQRCode', addressType);
</script>

<div class="stretch">
	<div class="flex gap-8 mb-6 justify-between">
		<Card>
			ICP Principal

			<TokenLogo slot="icon" color="white" token={ICP_TOKEN} />

			<span class="break-all" slot="description">
				{shortenWithMiddleEllipsis($icrcAccountIdentifierText ?? '')}
			</span>
		</Card>

		<ReceiveActions
			on:click={() => displayQRCode($icrcAccountIdentifierText ?? '')}
			address={$icrcAccountIdentifierText ?? ''}
			qrCodeAriaLabel={$i18n.wallet.text.display_wallet_address_qr}
			copyAriaLabel={$i18n.wallet.text.wallet_address_copied}
		/>
	</div>
</div>

<button class="primary full center text-center" on:click={modalStore.close}
	>{$i18n.core.text.done}</button
>
