<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { BtcAddress } from '$btc/types/address';
	import { BTC_DECIMALS } from '$env/tokens/tokens.btc.env';
	import IcReceiveWalletAddress from '$icp/components/receive/IcReceiveWalletAddress.svelte';
	import { btcAddressStore } from '$icp/stores/btc.store';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';
	import type { IcCkToken } from '$icp/types/ic-token';
	import ReceiveAddress from '$lib/components/receive/ReceiveAddress.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ReceiveQRCode } from '$lib/types/receive';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		onQRCode: (details: ReceiveQRCode) => void;
	}

	let { onQRCode }: Props = $props();

	const { tokenId, token, close } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const displayQRCode = ({ address, twinToken }: { address: BtcAddress; twinToken: Token }) =>
		onQRCode({
			address,
			addressLabel: $i18n.receive.bitcoin.text.bitcoin_address,
			addressToken: twinToken,
			copyAriaLabel: $i18n.receive.bitcoin.text.bitcoin_address_copied
		});

	let btcAddress = $derived($btcAddressStore?.[$tokenId]?.data);

	let kytFee = $derived($ckBtcMinterInfoStore?.[$tokenId]?.data.kyt_fee);

	let twinToken = $derived(($token as IcCkToken | undefined)?.twinToken);
</script>

<ContentWithToolbar>
	<IcReceiveWalletAddress {onQRCode} />

	{#if nonNullish(btcAddress) && nonNullish(twinToken)}
		<Hr spacing="lg" />

		<ReceiveAddress
			address={btcAddress}
			copyAriaLabel={$i18n.receive.bitcoin.text.bitcoin_address_copied}
			labelRef="bitcoin-address"
			network={twinToken.network}
			qrCodeAction={{
				enabled: true,
				ariaLabel: $i18n.receive.bitcoin.text.display_bitcoin_address_qr,
				onClick: () => displayQRCode({ address: btcAddress, twinToken })
			}}
		>
			{#snippet title()}
				{$i18n.receive.bitcoin.text.bitcoin_address}
			{/snippet}
			{#snippet text()}
				{$i18n.receive.bitcoin.text.from_network}&nbsp;{#if nonNullish(kytFee)}<span in:fade
						>{replacePlaceholders($i18n.receive.bitcoin.text.fee_applied, {
							$fee: formatToken({
								value: kytFee,
								unitName: BTC_DECIMALS,
								displayDecimals: BTC_DECIMALS
							})
						})}</span
					>{/if}
			{/snippet}
		</ReceiveAddress>
	{/if}

	{#snippet toolbar()}
		<ButtonDone onclick={close} />
	{/snippet}
</ContentWithToolbar>
