<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Component, Snippet, ComponentProps } from 'svelte';

	import { isTokenErc721 } from '$eth/utils/erc721.utils';
	import Avatar from '$lib/components/contact/Avatar.svelte';
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

	import type { ContactUi } from '$lib/types/contact';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus, TransactionType } from '$lib/types/transaction';

	import { getContactForAddress } from '$lib/utils/contact.utils';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';
	import { isTokenNonFungible } from '$lib/utils/nft.utils';
	import { findNft } from '$lib/utils/nfts.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
	import { mapTransactionIcon } from '$lib/utils/transaction.utils';
	import { parseNftId } from '$lib/validation/nft.validation';

	type NetworkLogoProps = ComponentProps<typeof NetworkLogo>;
	type Network = NetworkLogoProps['network'];
	type LogoColor = NetworkLogoProps['color'];
	type AddressType = NetworkLogoProps['addressType'];

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

	const address: string | undefined = $derived(
		type === 'send' ? to : type === 'receive' ? from : undefined
	);

	const contact: ContactUi | undefined = $derived(
		nonNullish(address)
			? getContactForAddress({
					contactList: $contacts,
					addressString: address
				})
			: undefined
	);

	const network: Network | undefined = $derived(
		isTokenNonFungible(token)
			? ((token as any)?.collection?.network ?? (token as any)?.network)
			: (token as any)?.network
	);

	const networkLogoColor: LogoColor = $derived('transparent');

	const mapNetworkToAddressType = (net: Network | undefined): AddressType => {
		const raw = String(
			net?.addressType ?? net?.type ?? net?.id ?? net?.symbol ?? net?.name ?? ''
		).toLowerCase();

		if (raw.includes('btc') || raw.includes('bitcoin')) return 'Btc';
		if (raw.includes('eth') || raw.includes('ethereum')) return 'Eth';
		if (raw.includes('sol') || raw.includes('solana')) return 'Sol';
		if (raw.includes('icrc') || raw.includes('icp') || raw.includes('internet computer')) return 'Icrcv2';
		return undefined;
	};

	const networkAddressType: AddressType = $derived(mapNetworkToAddressType(network));

	const nft = $derived(
		nonNullish($nftStore) && isTokenNonFungible(token) && nonNullish(tokenId)
			? findNft({ nfts: $nftStore, token, tokenId: parseNftId(tokenId) })
			: undefined
	);
</script>

<button class={`contents ${styleClass ?? ''}`} onclick={onClick}>
	<span class="block w-full rounded-xl px-3 py-2 hover:bg-brand-subtle-10">
		<Card noMargin>
			<span class="relative inline-flex items-center gap-1 whitespace-nowrap">
				{#if nonNullish(contact)}
					{type === 'send'
						? replacePlaceholders($i18n.transaction.text.sent_to, { $name: contact.name })
						: replacePlaceholders($i18n.transaction.text.received_from, { $name: contact.name })}
				{:else}
					{@render children?.()}
				{/if}

				{#if nonNullish(network)}
					<div class="flex">
						<NetworkLogo
							addressType={networkAddressType}
							color={networkLogoColor}
							{network}
							testId="network-tx"
						/>
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
				<span class="inline-flex min-w-0 items-center gap-2">
					{#if type === 'send'}
						<span class="shrink-0 text-tertiary">{$i18n.transaction.text.to}</span>
					{:else if type === 'receive'}
						<span class="shrink-0 text-tertiary">{$i18n.transaction.text.from}</span>
					{/if}

					{#if nonNullish(contact)}
						<span class="shrink-0">
							<Avatar name={contact.name} image={contact.image} variant="xxs" />
						</span>
					{/if}

					<span class="inline-flex min-w-0 items-center gap-1">
						<span class="truncate">
							{#if nonNullish(contact)}
								{contact.name}
							{:else if nonNullish(address)}
								{shortenWithMiddleEllipsis({ text: address })}
							{/if}
						</span>
					</span>

					<TransactionStatusComponent {status} />
				</span>
			{/snippet}
		</Card>
	</span>
</button>
