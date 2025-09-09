<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AddressBookQrCode from '$lib/components/address-book/AddressBookQrCode.svelte';
	import AddressInfoCard from '$lib/components/address-book/AddressInfoCard.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import {
		ADDRESS_EDIT_CANCEL_BUTTON,
		ADDRESS_BOOK_FALLBACK_MESSAGE
	} from '$lib/constants/test-ids.constants';
	import type { AddressBookSteps } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactAddressUi } from '$lib/types/contact';

	interface Props {
		address: ContactAddressUi;
		onClose: (step?: AddressBookSteps) => void;
	}

	const { address, onClose }: Props = $props();
</script>

<ContentWithToolbar styleClass="mb-10 flex flex-col items-stretch">
	{#if nonNullish(address?.address)}
		<!-- TODO: Change it with ReceivedQRCode. -->
		<AddressBookQrCode {address} />

		<AddressInfoCard {address} />
	{:else}
		<!-- Display a fallback message if no address is available.
		   TODO: Styling is minimal and could be enhanced. -->
		<div class="flex items-center justify-center py-4" data-testid={ADDRESS_BOOK_FALLBACK_MESSAGE}>
			<p class="text-center text-sm font-medium text-brand-primary"
				>{$i18n.address_book.text.no_address_found}</p
			>
		</div>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={onClose} testId={ADDRESS_EDIT_CANCEL_BUTTON} />
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
