<script lang="ts">
	import { getContext } from 'svelte';
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

	interface Props {
		onQRCode: (details: ReceiveQRCode) => void;
	}

	let { onQRCode }: Props = $props();

	const { close } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const displayQRCode = (details: Omit<ReceiveQRCode, 'addressToken'>) =>
		onQRCode({
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
			ariaLabel: $i18n.wallet.text.display_wallet_address_qr,
			onClick: () =>
				displayQRCode({
					address: $icrcAccountIdentifierText ?? '',
					addressLabel: $i18n.wallet.text.wallet_address,
					copyAriaLabel: $i18n.wallet.text.wallet_address_copied
				})
		}}
	>
		{#snippet title()}
			{$i18n.receive.icp.text.principal_title}
		{/snippet}
	</ReceiveAddress>

	<ReceiveAddress
		address={$icpAccountIdentifierText ?? ''}
		copyAriaLabel={$i18n.receive.icp.text.account_id_copied}
		copyButtonTestId={RECEIVE_TOKENS_MODAL_COPY_ICP_ACCOUNT_ID_BUTTON}
		labelRef="icp-account-id"
		network={ICP_NETWORK}
		qrCodeAction={{
			enabled: true,
			ariaLabel: $i18n.receive.icp.text.display_account_id_qr,
			onClick: () =>
				displayQRCode({
					address: $icpAccountIdentifierText ?? '',
					addressLabel: $i18n.receive.icp.text.account_id,
					copyAriaLabel: $i18n.receive.icp.text.account_id_copied
				})
		}}
		testId={RECEIVE_TOKENS_MODAL_ICP_SECTION}
	>
		{#snippet title()}
			{$i18n.receive.icp.text.icp_account_title}
		{/snippet}
	</ReceiveAddress>

	{#snippet toolbar()}
		<ButtonDone onclick={close} testId={RECEIVE_TOKENS_MODAL_DONE_BUTTON} />
	{/snippet}
</ContentWithToolbar>
