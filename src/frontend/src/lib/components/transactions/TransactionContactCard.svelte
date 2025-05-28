<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import SkeletonAddressCard from '$lib/components/address/SkeletonAddressCard.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import TransactionAddressActions from '$lib/components/transactions/TransactionAddressActions.svelte';
	import { contacts } from '$lib/derived/contacts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import { getContactForAddress } from '$lib/utils/contact.utils';

	interface Props {
		type: 'send' | 'receive';
		to: string | undefined;
		toExplorerUrl?: string;
		from: string | undefined;
		fromExplorerUrl?: string;
	}

	const { type, to, from, toExplorerUrl, fromExplorerUrl }: Props = $props();

	let contact: ContactUi | undefined = $derived(
		nonNullish(to) && nonNullish(from)
			? getContactForAddress({
					contactList: $contacts,
					addressString: type === 'send' ? to : from
				})
			: undefined
	);
</script>

{#if nonNullish(from) && nonNullish(to)}
	<AddressCard>
		{#snippet logo()}
			<AvatarWithBadge
				{contact}
				badge={{ type: 'addressType', address: type === 'send' ? to : from }}
			/>
		{/snippet}
		{#snippet content()}
			<span class="mx-1 flex flex-col items-start text-left">
				<span class="font-bold"
					>{type === 'send' ? $i18n.transaction.text.to : $i18n.transaction.text.from}: {contact?.name}</span
				>
				<span class="w-full truncate">{type === 'send' ? to : from}</span>
				<!-- Todo: enable button once the save flow is implemented
			<Button link styleClass="mt-3 text-sm"><IconUserSquare size="20px" /> Save address</Button>
			-->
			</span>
		{/snippet}
		{#snippet actions()}
			<TransactionAddressActions
				copyAddress={type === 'send' ? to : from}
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
