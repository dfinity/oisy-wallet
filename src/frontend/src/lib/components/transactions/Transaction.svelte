<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { type Component, type Snippet, untrack } from 'svelte';
	import { alchemyProviders } from '$eth/providers/alchemy.providers';
	import type { EthNonFungibleToken } from '$eth/types/nft';
	import ContactWithAvatar from '$lib/components/contact/ContactWithAvatar.svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
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
	import type { Network } from '$lib/types/network';
	import type { Nft } from '$lib/types/nft';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus, TransactionType } from '$lib/types/transaction';
	import { filterAddressFromContact, getContactForAddress } from '$lib/utils/contact.utils';
	import { shortenWithMiddleEllipsis, formatSecondsToDate } from '$lib/utils/format.utils';
	import { isNetworkIdEthereum, isNetworkIdEvm } from '$lib/utils/network.utils';
	import { isTokenNonFungible } from '$lib/utils/nft.utils';
	import { findNft } from '$lib/utils/nfts.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
	import { mapTransactionIcon } from '$lib/utils/transaction.utils';
	import { parseNftId } from '$lib/validation/nft.validation';

	interface Props {
		displayAmount?: bigint;
		type: TransactionType;
		status: TransactionStatus;
		timestamp?: number;
		styleClass?: string;
		token: Token;
		iconType: 'token' | 'transaction';
		to?: string;
		from?: string;
		tokenId?: number;
		children: Snippet;
		onClick?: () => void;
		approveSpender?: string;
		fullDate?: boolean;
	}

	const {
		displayAmount,
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
		onClick,
		approveSpender,
		fullDate = false
	}: Props = $props();

	const cardIcon: Component = $derived(mapTransactionIcon({ type, status }));

	const iconWithOpacity: boolean = $derived(status === 'pending' || status === 'unconfirmed');

	const address: string | undefined = $derived(
		type === 'send'
			? to
			: type === 'receive'
				? from
				: type === 'approve'
					? approveSpender
					: undefined
	);

	const contact = $derived(
		nonNullish(address)
			? getContactForAddress({ addressString: address, contactList: $contacts })
			: undefined
	);

	const contactAddress = $derived(filterAddressFromContact({ contact, address }));

	const network: Network | undefined = $derived(token.network);

	const existingNft = $derived(
		nonNullish($nftStore) && isTokenNonFungible(token) && nonNullish(tokenId)
			? findNft({ nfts: $nftStore, token, tokenId: parseNftId(String(tokenId)) })
			: undefined
	);

	let fetchedNft = $state<Nft | undefined>();

	// It may happen that an NFT was sent out by the user or burnt.
	// In that case, it will not be in the nftStore anymore.
	// So we cannot find it and render the image in the transaction list.
	// However, we prefer to always show it, so we try and fetch the metadata anyway.
	const updateFetchedNft = async () => {
		if (nonNullish(existingNft)) {
			return;
		}

		if (isNullish($nftStore) || !isTokenNonFungible(token) || isNullish(tokenId)) {
			return;
		}

		if (!isNetworkIdEthereum(network.id) && !isNetworkIdEvm(network.id)) {
			return;
		}

		try {
			const { getNftMetadata } = alchemyProviders(network.id);

			fetchedNft = await getNftMetadata({
				// For now, it is acceptable to cast it since we checked before if the network is Ethereum or EVM.
				token: token as EthNonFungibleToken,
				tokenId: parseNftId(String(tokenId))
			});
		} catch (_: unknown) {
			fetchedNft = undefined;
		}
	};

	$effect(() => {
		[token, tokenId, existingNft];

		untrack(() => updateFetchedNft());
	});

	const nft = $derived(existingNft ?? fetchedNft);
</script>

<button class={`contents ${styleClass ?? ''}`} onclick={onClick}>
	<span class="block w-full rounded-xl px-2 py-2 hover:bg-brand-subtle-10">
		<Card noMargin withGap>
			<span class="flex min-w-0 flex-1 basis-0 items-center gap-1">
				<span class="truncate first-letter:capitalize">
					{@render children()}
				</span>

				{#if nonNullish(network)}
					<div class="shrink-0">
						<NetworkLogo {network} testId="transaction-network" transparent />
					</div>
				{/if}
			</span>

			{#snippet icon()}
				<div>
					{#if iconType === 'token'}
						{#if nonNullish(nft)}
							<NftLogo
								badge={{ type: 'icon', icon: cardIcon, ariaLabel: type }}
								logoSize="md"
								{nft}
							/>
						{:else}
							<TokenLogo
								badge={{ type: 'icon', icon: cardIcon, ariaLabel: type }}
								data={token}
								logoSize="md"
							/>
						{/if}
					{:else}
						<RoundedIcon icon={cardIcon} opacity={iconWithOpacity} size="16" />
					{/if}
				</div>
			{/snippet}

			{#snippet amount()}
				{#if nonNullish(displayAmount)}
					{#if $isPrivacyMode}
						<IconDots />
					{:else}
						<Amount
							amount={displayAmount}
							decimals={token.decimals}
							formatPositiveAmount
							symbol={getTokenDisplaySymbol(token)}
						/>
					{/if}
				{/if}
			{/snippet}
			{#snippet amountDescription()}
				{#if nonNullish(timestamp)}
					<span class="text-xs sm:text-sm" data-tid="receive-tokens-modal-transaction-timestamp">
						{formatSecondsToDate({
							seconds: Number(timestamp),
							language: $currentLanguage,
							formatOptions: {
								hour: '2-digit',
								minute: '2-digit',
								hour12: false
							},
							timeOnly: !fullDate
						})}
					</span>
				{/if}
			{/snippet}

			{#snippet description()}
				<span
					class="flex min-w-0 flex-col items-center items-start text-xs text-primary sm:flex-row sm:text-sm"
				>
					<span class="inline-flex min-w-0 items-center gap-1">
						{#if type === 'send'}
							<span class="shrink-0">{$i18n.transaction.text.to}</span>
						{:else if type === 'receive'}
							<span class="shrink-0">{$i18n.transaction.text.from}</span>
						{:else if type === 'approve'}
							<span class="shrink-0">{$i18n.transaction.text.for}</span>
						{/if}

						{#if nonNullish(contact)}
							<ContactWithAvatar {contact} {contactAddress} />
						{:else if nonNullish(address)}
							<span class="flex inline-block max-w-38 min-w-0 flex-wrap items-center truncate">
								{shortenWithMiddleEllipsis({ text: address })}
							</span>
						{/if}
					</span>
					<span class="truncate text-tertiary">
						<TransactionStatusComponent {status} />
					</span>
				</span>
			{/snippet}
		</Card>
	</span>
</button>
