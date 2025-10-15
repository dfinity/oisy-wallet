<script lang="ts">
	import ReceiveAddress from '$lib/components/receive/ReceiveAddress.svelte';
	import ReceiveQrCode from '$lib/components/receive/ReceiveQrCode.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address, OptionAddress } from '$lib/types/address';
	import type { Network } from '$lib/types/network';
	import type { Token } from '$lib/types/token';

	interface Props {
		address: OptionAddress<Address>;
		addressLabel?: string;
		addressToken?: Token;
		testId?: string;
		copyButtonTestId?: string;
		network: Network;
		copyAriaLabel: string;
	}

	let {
		address,
		addressLabel,
		addressToken,
		testId,
		copyButtonTestId,
		network,
		copyAriaLabel
	}: Props = $props();

	// TODO: replace properties (address, labels etc.) with a mandatory property of type ReceiveQrCode
</script>

<ReceiveQrCode address={address ?? ''} {addressToken} />

<ReceiveAddress
	address={address ?? ''}
	{copyAriaLabel}
	{copyButtonTestId}
	labelRef="address"
	{network}
	qrCodeAction={{ enabled: false }}
	{testId}
>
	{#snippet title()}
		{addressLabel ?? $i18n.wallet.text.address}
	{/snippet}
</ReceiveAddress>
