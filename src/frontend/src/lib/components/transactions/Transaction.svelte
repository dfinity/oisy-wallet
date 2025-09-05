<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Component, Snippet } from 'svelte';
	import { isTokenErc721 } from '$eth/utils/erc721.utils';
	import Divider from '$lib/components/common/Divider.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import NftLogo from '$lib/components/nfts/NftLogo.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TransactionStatusComponent from '$lib/components/transactions/TransactionStatus.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { contacts } from '$lib/derived/contacts.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { nftStore } from '$lib/stores/nft.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus, TransactionType } from '$lib/types/transaction';
	import { filterAddressFromContact, getContactForAddress } from '$lib/utils/contact.utils';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { formatSecondsToDate } from '$lib/utils/format.utils';
	import { isTokenNonFungible } from '$lib/utils/nft.utils';
	import { findNft } from '$lib/utils/nfts.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
	import { mapTransactionIcon } from '$lib/utils/transaction.utils';
	import { parseNftId } from '$lib/validation/nft.validation';

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
		tokenId?: number;
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
		tokenId,
		children,
		onClick
	}: Props = $props();

	const cardIcon: Component = $derived(mapTransactionIcon({ type, status }));

	const iconWithOpacity: boolean = $derived(status === 'pending' || status === 'unconfirmed');

	const contactAddress: string | undefined = $derived(
		type === 'send' ? to : type === 'receive' ? from : undefined
	);

	const contact: ContactUi | undefined = $derived(
		nonNullish(contactAddress)
			? getContactForAddress({ addressString: contactAddress, contactList: $contacts })
			: undefined
	);

	const addressAlias: string | undefined = $derived(
		filterAddressFromContact({ contact, address: contactAddress })?.label
	);

	const nft = $derived(
		nonNullish($nftStore) && isTokenNonFungible(token) && nonNullish(tokenId)
			? findNft({ nfts: $nftStore, token, tokenId: parseNftId(tokenId) })
			: undefined
	);
</script>

<button class={`contents ${styleClass ?? ''}`} onclick={onClick}>
	<span class="block w-full rounded-xl px-3 py-2 hover:bg-brand-subtle-10">
		<Card noMargin>
			<span
				class="relative inline-flex items-center gap-1 whitespace-nowrap first-letter:capitalize"
			>
				{#if nonNullish(contact)}
					{type === 'send' ? $i18n.transaction.type.send : $i18n.transaction.type.receive}
				{:else}
					{@render children?.()}
				{/if}
			</span>

			{#snippet icon()}
				<div>
					{#if iconType === 'token'}
						{#if isTokenNonFungible(token) && nonNullish(nft)}
							<NftLogo badge={{ type: 'icon', icon: cardIcon, ariaLabel: type }} {nft} />
						{:else}
							<TokenLogo badge={{ type: 'icon', icon: cardIcon, ariaLabel: type }} data={token} />
						{/if}
					{:else}
						<RoundedIcon icon={cardIcon} opacity={iconWithOpacity} />
					{/if}
				</div>
			{/snippet}

			{#snippet amount()}
				{#if nonNullish(cardAmount) && !isTokenErc721(token)}
					{#if $isPrivacyMode}
						<IconDots />
					{:else}
						<Amount
							amount={cardAmount}
							decimals={token.decimals}
							formatPositiveAmount
							symbol={getTokenDisplaySymbol(token)}
						/>
					{/if}
				{/if}
			{/snippet}
			{#snippet amountDescription()}
				{#if nonNullish(timestamp)}
					<span data-tid="receive-tokens-modal-transaction-timestamp">
						{formatSecondsToDate({
							seconds: Number(timestamp),
							language: $currentLanguage,
							formatOptions: {
								hour: '2-digit',
								minute: '2-digit',
								hour12: false
							}
						})}
					</span>
				{/if}
			{/snippet}

			{#snippet description()}
				<span class="inline-flex min-w-0 items-center gap-2 text-primary">
					{#if type === 'send'}
						<span class="shrink-0">{$i18n.transaction.text.to}</span>
					{:else if type === 'receive'}
						<span class="shrink-0">{$i18n.transaction.text.from}</span>
					{/if}

					{#if nonNullish(contact)}
						<span class="shrink-0">
							<Avatar name={contact.name} image={contact.image} />
						</span>
					{/if}

					<span class="inline-flex min-w-0 items-center gap-1">
						<span>
							{#if nonNullish(contact)}
								{contact.name}
							{:else if nonNullish(contactAddress)}
								{shortenWithMiddleEllipsis({ text: contactAddress })}
							{/if}
						</span>
						{#if nonNullish(addressAlias) && addressAlias !== ''}
							<span class="inline-flex items-center gap-1 text-tertiary">
								<Divider />{addressAlias}
							</span>
						{/if}
					</span>

					<TransactionStatusComponent {status} />
				</span>
			{/snippet}
		</Card>
	</span>
</button>
