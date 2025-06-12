<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import SkeletonAddressCard from '$lib/components/address/SkeletonAddressCard.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import IconUserSquare from '$lib/components/icons/lucide/IconUserSquare.svelte';
	import TransactionAddressActions from '$lib/components/transactions/TransactionAddressActions.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { contacts } from '$lib/derived/contacts.derived';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore, type OpenTransactionParams } from '$lib/stores/modal.store';
	import type { ContactUi } from '$lib/types/contact';
	import { getContactForAddress } from '$lib/utils/contact.utils';
	import type { IcTransaction, IcTransactionUi } from '$icp/types/ic-transaction';
	import type { AnyTransactionUi } from '$lib/types/transaction';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import type { BtcTransactionUi } from '$btc/types/btc';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';
	import { isIcToken } from '$icp/validation/ic-token.validation.js';
	import { isSupportedEthToken } from '$eth/utils/eth.utils';
	import { isSolanaToken } from '$sol/utils/token.utils';

	interface Props {
		type: 'send' | 'receive';
		to: string | undefined;
		toExplorerUrl?: string;
		from: string | undefined;
		fromExplorerUrl?: string;
	}

	const { type, to, from, toExplorerUrl, fromExplorerUrl }: Props = $props();

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

	let getOnComplete = (modalStoreDataClosure: OpenTransactionParams<AnyTransactionUi>) => () => {
		if (isIcToken(modalStoreDataClosure.token)) {
			modalStore.openIcTransaction({
				id: Symbol(),
				data: modalStoreDataClosure as OpenTransactionParams<IcTransactionUi>
			});
		} else if (isSupportedEthToken(modalStoreDataClosure.token)) {
			modalStore.openEthTransaction({
				id: Symbol(),
				data: modalStoreDataClosure as OpenTransactionParams<EthTransactionUi>
			});
		} else if (isSolanaToken(modalStoreDataClosure.token)) {
			modalStore.openSolTransaction({
				id: Symbol(),
				data: modalStoreDataClosure as OpenTransactionParams<SolTransactionUi>
			});
		} else {
			modalStore.openBtcTransaction({
				id: Symbol(),
				data: modalStoreData as OpenTransactionParams<BtcTransactionUi>
			});
		}
	};
</script>

{#if nonNullish(address)}
	<AddressCard>
		{#snippet logo()}
			<AvatarWithBadge {contact} badge={{ type: 'addressType', address }} />
		{/snippet}
		{#snippet content()}
			<span class="mx-1 flex flex-col items-start text-left">
				<span class="font-bold"
					>{type === 'send' ? $i18n.transaction.text.to : $i18n.transaction.text.from}: {contact?.name}</span
				>
				<span class="w-full truncate">{address}</span>

				{#if isNullish(contact)}
					<Button
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
						link
						styleClass="mt-3 text-sm"
						ariaLabel={$i18n.address.save.title}
						><IconUserSquare size="20px" /> {$i18n.address.save.title}</Button
					>
				{/if}
			</span>
		{/snippet}
		{#snippet actions()}
			<TransactionAddressActions
				copyAddress={address}
				copyAddressText={type === 'send'
					? $i18n.transaction.text.to_copied
					: $i18n.transaction.text.from_copied}
				explorerUrl={type === 'send' ? toExplorerUrl : fromExplorerUrl}
				explorerUrlAriaLabel={type === 'send'
					? $i18n.transaction.alt.open_to_block_explorer
					: $i18n.transaction.alt.open_from_block_explorer}
			/>
		{/snippet}
	</AddressCard>
{:else}
	<SkeletonAddressCard />
{/if}
