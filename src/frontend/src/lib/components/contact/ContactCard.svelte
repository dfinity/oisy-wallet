<script lang="ts">
	import { Collapsible } from '@dfinity/gix-components';
	import AddressItemActions from '$lib/components/contact/AddressItemActions.svelte';
	import AddressListItem from '$lib/components/contact/AddressListItem.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import IconExpand from '$lib/components/icons/IconExpand.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import {
		CONTACT_CARD,
		CONTACT_CARD_BUTTON,
		CONTACT_CARD_EXPAND_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		contact: ContactUi;
		onClick: () => void;
		onInfo: (addressIndex: number) => void;
		initiallyExpanded?: boolean;
	}

	let { contact, onInfo, onClick, initiallyExpanded = false }: Props = $props();

	let toggleContent = $state<() => void | undefined>();

	let singleAddress = $derived(contact.addresses.length === 1);
	let multipleAddresses = $derived(contact.addresses.length > 1);

	let expanded = $state(initiallyExpanded);
</script>

{#snippet header()}
	<LogoButton {onClick} hover={false} condensed testId={CONTACT_CARD_BUTTON}>
		{#snippet logo()}
			<AvatarWithBadge {contact} badge={{ type: 'addressTypeOrCount' }} variant="sm" />
		{/snippet}

		{#snippet title()}
			{contact.name}
		{/snippet}

		{#snippet description()}
			<span class="flex items-center">
				{#each contact.addresses as address, index (index)}
					{#if index !== 0}
						&nbsp;<span class="text-[0.5rem]">•</span>&nbsp;
					{/if}
					<span class:font-bold={singleAddress} class:text-primary={singleAddress}
						>{$i18n.address.types[address.addressType]}</span
					>
				{/each}
				{#if singleAddress}
					&nbsp;{shortenWithMiddleEllipsis({ text: contact.addresses[0].address })}
				{/if}
			</span>
		{/snippet}

		{#snippet action()}
			{#if singleAddress}
				<AddressItemActions
					styleClass="ml-auto"
					address={contact.addresses[0]}
					onInfo={() => onInfo(0)}
				/>
			{:else if multipleAddresses}
				<ButtonIcon
					styleClass="text-primary"
					onclick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						toggleContent?.();
						expanded = !expanded;
					}}
					ariaLabel={expanded
						? $i18n.address_book.alt.hide_addresses
						: $i18n.address_book.alt.show_addresses_of_contact}
					testId={CONTACT_CARD_EXPAND_BUTTON}
				>
					{#snippet icon()}
						<IconExpand {expanded} />
					{/snippet}
				</ButtonIcon>
			{/if}
		{/snippet}
	</LogoButton>
{/snippet}

<div
	class="flex w-full flex-col rounded-xl bg-primary p-2 hover:bg-brand-subtle-20 dark:hover:bg-brand-tertiary"
	data-tid={CONTACT_CARD}
>
	{#if multipleAddresses}
		<Collapsible
			iconSize="medium"
			{expanded}
			{initiallyExpanded}
			externalToggle={true}
			expandButton={false}
			bind:toggleContent
		>
			<div slot="header" class="flex-grow">
				{@render header()}
			</div>
			<div class="flex flex-col gap-1.5 md:pl-20">
				{#each contact.addresses as address, index (index)}
					<AddressListItem {address} onInfo={() => onInfo(index)}></AddressListItem>
				{/each}
			</div>
		</Collapsible>
	{:else}
		{@render header()}
	{/if}
</div>
