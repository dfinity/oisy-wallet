<script lang="ts">
	import AddressBookQrCode from '$lib/components/address-book/AddressBookQrCode.svelte';
	import AddressListItem from '$lib/components/contact/AddressListItem.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import { ADDRESS_EDIT_CANCEL_BUTTON } from '$lib/constants/test-ids.constants';
	import type { ContactAddressUi } from '$lib/types/contact';

	const { address, close }: { address: ContactAddressUi; close: () => void } = $props();

	const goBack = () => {
		close();
	};
</script>

<div class="flex flex-col gap-4">
	{#if address?.address}
		<AddressBookQrCode {address} />

		<AddressListItem
			{address}
			showFullAddress={true}
			styleClass="shadow-sm border border-divider"
			showLabelOutside={true}
		/>

	{:else}
		<p class="text-red-600">No address available</p>
	{/if}

	<div class="flex w-full justify-center pt-10">
		<ButtonBack onclick={goBack} testId={ADDRESS_EDIT_CANCEL_BUTTON} />
	</div>
</div>
