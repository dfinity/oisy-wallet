<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Component, Snippet } from 'svelte';
	import { isTokenErc721 } from '$eth/utils/erc721.utils';
	import Divider from '$lib/components/common/Divider.svelte';
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
	import { formatSecondsToDate } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';
	import { isTokenNonFungible } from '$lib/utils/nft.utils';
	import { findNft } from '$lib/utils/nfts.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
	import { mapTransactionIcon } from '$lib/utils/transaction.utils';
	import { parseNftId } from '$lib/validation/nft.validation';

	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import type { ComponentProps } from 'svelte'; 
	type NetworkLogoProps = ComponentProps<typeof NetworkLogo>; 
	type Network = NetworkLogoProps['network'];
	type LogoColor = NetworkLogoProps['color'];

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

	const network: Network | undefined = $derived(
		isTokenNonFungible(token)
			? (token as any)?.network ?? (token as any)?.collection?.network
			: (token as any)?.network
	); 

	const networkLogoColor: LogoColor = $derived('transparent'); 
</script>

<button class={`contents ${styleClass ?? ''}`} onclick={onClick}>
	<span class="block w-full rounded-xl px-3 py-2 hover:bg-brand-subtle-10">
		<Card noMargin>
			<span class="inline-flex items-center gap-1 relative whitespace-nowrap">
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

				{#if nonNullish(network)}
					<div class="flex">
						<NetworkLogo color={networkLogoColor} {network} testId="network-tx" />
					</div>
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
				{new Intl.DateTimeFormat($currentLanguage, {
				  hour: '2-digit',
				  minute: '2-digit',
				  hour12: false
				}).format(new Date(Number(timestamp) * 1000))}
			  </span>
			{/if}
		  {/snippet}
		  

			{#snippet description()}
				<TransactionStatusComponent {status} />
			{/snippet}
		</Card>
	</span>
</button>
