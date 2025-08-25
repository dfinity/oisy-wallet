<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import SkeletonAddressCard from '$lib/components/address/SkeletonAddressCard.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import IconUserSquare from '$lib/components/icons/lucide/IconUserSquare.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { contacts } from '$lib/derived/contacts.derived';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore, type OpenTransactionParams } from '$lib/stores/modal.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { AnyTransactionUi } from '$lib/types/transaction';
	import { getContactForAddress } from '$lib/utils/contact.utils';

	interface Props {
		type: 'send' | 'receive';
		to: string | undefined;
		toExplorerUrl?: string;
		from: string | undefined;
		fromExplorerUrl?: string;
		onSaveAddressComplete?: (data: OpenTransactionParams<AnyTransactionUi>) => void;
	}

	const { type, to, from, toExplorerUrl, fromExplorerUrl, onSaveAddressComplete }: Props = $props();

	let address: string | undefined = $derived(
		type === 'send' && nonNullish(to) ? to : type !== 'send' && nonNullish(from) ? from : undefined
	);

	let contact: ContactUi | undefined = $derived(
		nonNullish(address)
			? getContactForAddress({
					contactList: $contacts,
					addressString: address
				})
			: undefined
	);

	let modalStoreData = $derived($modalStore?.data as OpenTransactionParams<AnyTransactionUi>);

	const getOnComplete = (data: OpenTransactionParams<AnyTransactionUi>) => () =>
		onSaveAddressComplete?.(data);
</script>

{#if nonNullish(address)}
	<AddressCard>
		{#snippet logo()}
			<AvatarWithBadge badge={{ type: 'addressType', address }} {contact} />
		{/snippet}
		{#snippet content()}
			<span class="mx-1 flex flex-col items-start text-left">
				<span class="font-bold"
					>{type === 'send' ? $i18n.transaction.text.to : $i18n.transaction.text.from}: {contact?.name}</span
				>
				<span class="w-full truncate">{address}</span>

				{#if isNullish(contact)}
					<Button
						ariaLabel={$i18n.address.save.title}
						link
						onclick={() =>
							modalStore.openAddressBook({
								id: Symbol(),
								data: {
									entrypoint: {
										type: AddressBookSteps.SAVE_ADDRESS,
										address,
										onComplete: getOnComplete(modalStoreData)
									}
								}
							})}
						styleClass="mt-3 text-sm"
						><IconUserSquare size="20px" /> {$i18n.address.save.title}</Button
					>
				{/if}
			</span>
		{/snippet}
		{#snippet actions()}
			<AddressActions
				copyAddress={address}
				copyAddressText={type === 'send'
					? $i18n.transaction.text.to_copied
					: $i18n.transaction.text.from_copied}
				externalLink={type === 'send' ? toExplorerUrl : fromExplorerUrl}
				externalLinkAriaLabel={type === 'send'
					? $i18n.transaction.alt.open_to_block_explorer
					: $i18n.transaction.alt.open_from_block_explorer}
			/>
		{/snippet}
	</AddressCard>
{:else}
	<SkeletonAddressCard />
{/if}
