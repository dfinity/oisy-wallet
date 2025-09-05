<script lang="ts">
	import ReceiveAddress from '$lib/components/receive/ReceiveAddress.svelte';
	import ReceiveQrCode from '$lib/components/receive/ReceiveQrCode.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address, OptionAddress } from '$lib/types/address';
	import type { Network } from '$lib/types/network';
	import type { ReceiveQRCodeAction } from '$lib/types/receive';
	import type { Token } from '$lib/types/token';

	export let address: OptionAddress<Address>;
	export let addressLabel: string | undefined = undefined;
	export let addressToken: Token | undefined;

	export let testId: string | undefined = undefined;
	export let copyButtonTestId: string | undefined = undefined;

	export let network: Network;
	export let qrCodeAction: ReceiveQRCodeAction;
	export let copyAriaLabel: string;

	// TODO: replace properties (address, labels etc.) with a mandatory property of type ReceiveQrCode
</script>

<ReceiveQrCode address={address ?? ''} {addressToken} />

<ReceiveAddress
	address={address ?? ''}
	{copyAriaLabel}
	{copyButtonTestId}
	labelRef="address"
	{network}
	{qrCodeAction}
	{testId}
>
	{#snippet title()}
		{addressLabel ?? $i18n.wallet.text.address}
	{/snippet}
</ReceiveAddress>
