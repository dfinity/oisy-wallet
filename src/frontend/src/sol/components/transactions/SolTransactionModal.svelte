<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TransactionContactCard from '$lib/components/transactions/TransactionContactCard.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore, type OpenTransactionParams } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import type { AnyTransactionUi } from '$lib/types/transaction';
	import {
		formatSecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkSolana } from '$lib/utils/network.utils';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';

	interface Props {
		transaction: SolTransactionUi;
		token: OptionToken;
	}

	const { transaction, token }: Props = $props();

	let {
		from: fromAddress,
		fromOwner,
		value,
		timestamp,
		signature: id,
		blockNumber,
		to: toAddress,
		toOwner,
		type,
		status
	} = $derived(transaction);

	let from = $derived<SolTransactionUi['from'] | SolTransactionUi['fromOwner'] | undefined>(
		fromOwner ?? fromAddress
	);
	let to = $derived<SolTransactionUi['to'] | SolTransactionUi['toOwner'] | undefined>(
		toOwner ?? toAddress
	);

	let explorerUrl: string | undefined = $derived(
		isNetworkSolana(token?.network) ? token.network.explorerUrl : undefined
	);

	let txExplorerUrl: string | undefined = $derived(
		nonNullish(explorerUrl) ? replacePlaceholders(explorerUrl, { $args: `tx/${id}/` }) : undefined
	);

	let toExplorerUrl: string | undefined = $derived(
		nonNullish(explorerUrl)
			? replacePlaceholders(explorerUrl, { $args: `account/${to}/` })
			: undefined
	);

	let fromExplorerUrl: string | undefined = $derived(
		nonNullish(explorerUrl)
			? replacePlaceholders(explorerUrl, { $args: `account/${from}/` })
			: undefined
	);

	let toAtaExplorerUrl: string | undefined = $derived(
		nonNullish(explorerUrl)
			? replacePlaceholders(explorerUrl, { $args: `account/${toAddress}/` })
			: undefined
	);

	let fromAtaExplorerUrl: string | undefined = $derived(
		nonNullish(explorerUrl)
			? replacePlaceholders(explorerUrl, { $args: `account/${fromAddress}/` })
			: undefined
	);

	const onSaveAddressComplete = (data: OpenTransactionParams<AnyTransactionUi>) => {
		modalStore.openSolTransaction({
			id: Symbol(),
			data: data as OpenTransactionParams<SolTransactionUi>
		});
	};
</script>

<Modal onClose={modalStore.close}>
	{#snippet title()}{$i18n.transaction.text.details}{/snippet}

	<ContentWithToolbar>
		<ModalHero variant={type === 'receive' ? 'success' : 'default'}>
			{#snippet logo()}
				{#if nonNullish(token)}
					<TokenLogo badge={{ type: 'network' }} data={token} logoSize="lg" />
				{/if}
			{/snippet}
			{#snippet subtitle()}
				<span class="capitalize">{type}</span>
			{/snippet}
			{#snippet title()}
				{#if nonNullish(token) && nonNullish(value)}
					<output class:text-success-primary={type === 'receive'}>
						{formatToken({
							value,
							unitName: token.decimals,
							displayDecimals: token.decimals,
							showPlusSign: type === 'receive'
						})}
						{token.symbol}
					</output>
				{:else}
					&ZeroWidthSpace;
				{/if}
			{/snippet}
		</ModalHero>

		{#if nonNullish(toAddress) && nonNullish(fromAddress)}
			<TransactionContactCard
				{from}
				{fromExplorerUrl}
				{onSaveAddressComplete}
				{to}
				{toExplorerUrl}
				type={type === 'receive' ? 'receive' : 'send'}
			/>
		{/if}

		<List styleClass="mt-5">
			{#if type === 'receive' && nonNullish(from) && nonNullish(fromAddress) && from !== fromAddress}
				<ListItem>
					<span>{$i18n.transaction.text.from_ata}</span>
					<output class="flex max-w-[50%] flex-row">
						<output>{shortenWithMiddleEllipsis({ text: fromAddress })}</output>

						<AddressActions
							copyAddress={fromAddress}
							copyAddressText={$i18n.transaction.text.from_ata_copied}
							externalLink={fromAtaExplorerUrl}
							externalLinkAriaLabel={$i18n.transaction.alt.open_to_block_explorer}
						/>
					</output>
				</ListItem>
			{/if}
			{#if type === 'send' && nonNullish(to) && nonNullish(toAddress) && to !== toAddress}
				<ListItem>
					<span>{$i18n.transaction.text.to_ata}</span>
					<output class="flex max-w-[50%] flex-row">
						<output>{shortenWithMiddleEllipsis({ text: toAddress })}</output>
						<AddressActions
							copyAddress={toAddress}
							copyAddressText={$i18n.transaction.text.to_ata_copied}
							externalLink={toAtaExplorerUrl}
							externalLinkAriaLabel={$i18n.transaction.alt.open_from_block_explorer}
						/>
					</output>
				</ListItem>
			{/if}

			{#if nonNullish(id)}
				<ListItem>
					<span>
						{$i18n.transaction.text.hash}
					</span>

					<span>
						<output>{shortenWithMiddleEllipsis({ text: id })}</output>
						<AddressActions
							copyAddress={id}
							copyAddressText={replacePlaceholders($i18n.transaction.text.hash_copied, {
								$hash: id
							})}
							externalLink={txExplorerUrl}
							externalLinkAriaLabel={$i18n.transaction.alt.open_block_explorer}
						/>
					</span>
				</ListItem>
			{/if}

			{#if nonNullish(blockNumber)}
				<ListItem>
					<span>
						{$i18n.transaction.text.block}
					</span>

					<output>{blockNumber}</output>
				</ListItem>
			{/if}

			{#if nonNullish(status)}
				<ListItem>
					<span>
						{$i18n.transaction.text.status}
					</span>
					<span>
						{`${$i18n.transaction.status[status]}`}
					</span>
				</ListItem>
			{/if}

			{#if nonNullish(timestamp)}
				<ListItem>
					<span>
						{$i18n.transaction.text.timestamp}
					</span>

					<output
						>{formatSecondsToDate({
							seconds: Number(timestamp),
							language: $currentLanguage
						})}</output
					>
				</ListItem>
			{/if}

			{#if nonNullish(value) && nonNullish(token)}
				<ListItem>
					<span>{$i18n.core.text.amount}</span>

					<output>
						{formatToken({
							value,
							unitName: token.decimals,
							displayDecimals: token.decimals
						})}
						{token.symbol}
					</output>
				</ListItem>
			{/if}
		</List>

		{#snippet toolbar()}
			<ButtonCloseModal />
		{/snippet}
	</ContentWithToolbar>
</Modal>
