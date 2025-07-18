<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Component, Snippet } from 'svelte';
	import Divider from '$lib/components/common/Divider.svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TransactionStatusComponent from '$lib/components/transactions/TransactionStatus.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { contacts } from '$lib/derived/contacts.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus, TransactionType } from '$lib/types/transaction';
	import { filterAddressFromContact, getContactForAddress } from '$lib/utils/contact.utils';
	import { formatSecondsToDate } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
	import { mapTransactionIcon } from '$lib/utils/transaction.utils';

	interface Props {
		amount?: bigint;
		type: TransactionType;
		status: TransactionStatus;
		timestamp?: number;
		styleClass?: string;
		token: Token;
		iconType: 'token' | 'transaction';
		to?: string;
		from?: string;
		children?: Snippet;
		onClick?: () => void;
	}

	const {
		amount: cardAmount,
		type,
		status,
		timestamp,
		styleClass = undefined,
		token,
		iconType = 'transaction',
		to,
		from,
		children,
		onClick
	}: Props = $props();

	let cardIcon: Component = $derived(mapTransactionIcon({ type, status }));

	let iconWithOpacity: boolean = $derived(status === 'pending' || status === 'unconfirmed');

	let contactAddress: string | undefined = $derived(
		type === 'send' ? to : type === 'receive' ? from : undefined
	);

	let contact: ContactUi | undefined = $derived(
		nonNullish(contactAddress)
			? getContactForAddress({ addressString: contactAddress, contactList: $contacts })
			: undefined
	);

	let addressAlias: string | undefined = $derived(
		filterAddressFromContact({ contact, address: contactAddress })?.label
	);
</script>

<button class={`contents ${styleClass ?? ''}`} onclick={onClick}>
	<span class="block w-full rounded-xl px-3 py-2 hover:bg-brand-subtle-10">
		<Card noMargin>
			<span class="inline-block first-letter:capitalize">
				{#if nonNullish(contact)}
					{type === 'send'
						? replacePlaceholders($i18n.transaction.text.sent_to, { $name: contact.name })
						: replacePlaceholders($i18n.transaction.text.received_from, { $name: contact.name })}
					{#if nonNullish(addressAlias) && addressAlias !== ''}
						<span class="text-tertiary"><Divider />{addressAlias}</span>
					{/if}
				{:else}
					{@render children?.()}
				{/if}
			</span>

			{#snippet icon()}
				<div>
					{#if iconType === 'token'}
						<TokenLogo data={token} badge={{ type: 'icon', icon: cardIcon, ariaLabel: type }} />
					{:else}
						<RoundedIcon icon={cardIcon} opacity={iconWithOpacity} />
					{/if}
				</div>
			{/snippet}

			{#snippet amount()}
				{#if nonNullish(cardAmount)}
					{#if $isPrivacyMode}
						<IconDots />
					{:else}
						<Amount
							amount={cardAmount}
							decimals={token.decimals}
							symbol={getTokenDisplaySymbol(token)}
							formatPositiveAmount
						/>
					{/if}
				{/if}
			{/snippet}

			{#snippet description()}
				<span data-tid="receive-tokens-modal-transaction-timestamp">
					{#if nonNullish(timestamp)}
						{formatSecondsToDate({ seconds: Number(timestamp), language: $currentLanguage })}
					{/if}
				</span>
				<TransactionStatusComponent {status} />
			{/snippet}
		</Card>
	</span>
</button>
