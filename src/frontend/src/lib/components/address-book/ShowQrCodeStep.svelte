<script lang="ts">
	import AdressBookAction from '$lib/components/address-book/AdressBookAction.svelte';
	import AdressBookQrCode from '$lib/components/address-book/AdressBookQrCode.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address } from '$lib/types/address';
	import type { Token } from '$lib/types/token';

	export let address: Address;
	export let addressToken: Token | undefined = undefined;
	export let addressLabel: string | undefined = undefined;
	export let copyAriaLabel: string = $i18n.wallet.copy_to_clipboard;

	console.log('ShowQrCodeStep address:', address);
</script>

<div class="flex flex-col gap-4">
	<AdressBookQrCode address={address.address} {addressToken} />

	<AdressBookAction
		labelRef="address"
		address={address}
		{copyAriaLabel}
	>
		<svelte:fragment slot="title">
			{addressLabel ?? $i18n.wallet.text.address}
		</svelte:fragment>
	</AdressBookAction>
</div>
