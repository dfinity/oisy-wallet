<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import { icpAccountIdentifierText, icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';
	import ReceiveAddress from '$lib/components/receive/ReceiveAddress.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import {
		RECEIVE_TOKENS_MODAL_COPY_ICP_ADDRESS_BUTTON,
		RECEIVE_TOKENS_MODAL_COPY_ICP_ACCOUNT_ID_BUTTON,
		RECEIVE_TOKENS_MODAL_DONE_BUTTON,
		RECEIVE_TOKENS_MODAL_ICP_SECTION
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ReceiveQRCode } from '$lib/types/receive';

	const { close } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	const displayQRCode = (details: Omit<ReceiveQRCode, 'addressToken'>) =>
		dispatch('icQRCode', {
			...details,
			addressToken: ICP_TOKEN
		});
</script>

<ContentWithToolbar>
	<ReceiveAddress
		address={$icrcAccountIdentifierText ?? ''}
		copyAriaLabel={$i18n.wallet.text.wallet_address_copied}
		copyButtonTestId={RECEIVE_TOKENS_MODAL_COPY_ICP_ADDRESS_BUTTON}
		labelRef="wallet-address"
		network={ICP_NETWORK}
		qrCodeAction={{
			enabled: true,
			ariaLabel: $i18n.wallet.text.display_wallet_address_qr
		}}
		on:click={() =>
			displayQRCode({
				address: $icrcAccountIdentifierText ?? '',
				addressLabel: $i18n.wallet.text.wallet_address,
				copyAriaLabel: $i18n.wallet.text.wallet_address_copied
			})}
	>
		{#snippet title()}
			{$i18n.wallet.text.wallet_address}
		{/snippet}
		{#snippet text()}
			{$i18n.receive.icp.text.use_for_all_tokens}
		{/snippet}
	</ReceiveAddress>

	<Hr spacing="lg" />

	<ReceiveAddress
		address={$icpAccountIdentifierText ?? ''}
		copyAriaLabel={$i18n.receive.icp.text.account_id_copied}
		copyButtonTestId={RECEIVE_TOKENS_MODAL_COPY_ICP_ACCOUNT_ID_BUTTON}
		labelRef="icp-account-id"
		network={ICP_NETWORK}
		qrCodeAction={{
			enabled: true,
			ariaLabel: $i18n.receive.icp.text.display_account_id_qr
		}}
		testId={RECEIVE_TOKENS_MODAL_ICP_SECTION}
		on:click={() =>
			displayQRCode({
				address: $icpAccountIdentifierText ?? '',
				addressLabel: $i18n.receive.icp.text.account_id,
				copyAriaLabel: $i18n.receive.icp.text.account_id_copied
			})}
	>
		{#snippet title()}
			{$i18n.receive.icp.text.account_id}
		{/snippet}
		{#snippet text()}
			{$i18n.receive.icp.text.use_for_icp_deposit}
		{/snippet}
	</ReceiveAddress>

	{#snippet toolbar()}
		<ButtonDone onclick={close} testId={RECEIVE_TOKENS_MODAL_DONE_BUTTON} />
	{/snippet}
</ContentWithToolbar>
