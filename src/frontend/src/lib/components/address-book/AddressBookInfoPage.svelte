<script lang="ts">
	import AddressBookQrCode from '$lib/components/address-book/AddressBookQrCode.svelte';
	import AddressListItem from '$lib/components/contact/AddressListItem.svelte';
	import type { Address } from '$lib/types/contact';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import {
		ADDRESS_EDIT_CANCEL_BUTTON
	} from '$lib/constants/test-ids.constants';
	export let address: Address;
	export let close: () => void;
</script>

{#if address}
	<div class="flex flex-col gap-4">
		<AddressBookQrCode
			address={address}
		/>

		<AddressListItem
			{address}
			showFullAddress={true}
			showInfoButton={false}
			styleClass="shadow-sm border border-divider"
			onclick={() => {}}
		/>
		<div class="flex w-full justify-center pt-10">
			<ButtonCancel onclick={() => close()} colorStyle="primary" testId={ADDRESS_EDIT_CANCEL_BUTTON}></ButtonCancel>
		</div>
	</div>
{:else}
	<p class="text-red-600">No address available</p>
{/if}