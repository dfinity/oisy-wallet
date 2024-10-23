<script lang="ts">
	import ReceiveAddress from '$lib/components/receive/ReceiveAddress.svelte';
	import ReceiveQRCode from '$lib/components/receive/ReceiveQRCode.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address, OptionAddress } from '$lib/types/address';
	import type { Network } from '$lib/types/network';
	import type { ReceiveQRCodeAction } from '$lib/types/receive';
	import type { Token } from '$lib/types/token';

	export let address: OptionAddress<Address>;
	export let addressLabel: string | undefined = undefined;
	export let addressToken: Token | undefined;

	export let testId: string | undefined = undefined;

	export let network: Network;
	export let qrCodeAction: ReceiveQRCodeAction;
	export let copyAriaLabel: string;

	// TODO: replace property with mandatory property ReceiveQRCode
</script>

<ReceiveQRCode address={address ?? ''} {addressToken} />

<ReceiveAddress
	labelRef="address"
	address={address ?? ''}
	{testId}
	{network}
	{qrCodeAction}
	{copyAriaLabel}
>
	<svelte:fragment slot="title">{addressLabel ?? $i18n.wallet.text.address}</svelte:fragment>
	<slot name="text" slot="text" />
</ReceiveAddress>
