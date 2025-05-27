<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TransactionAddressActions from '$lib/components/transactions/TransactionAddressActions.svelte';
	import TransactionContactCard from '$lib/components/transactions/TransactionContactCard.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import {
		formatNanosecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';

	interface Props {
		transaction: IcTransactionUi;
		token: OptionToken;
	}

	const { transaction, token }: Props = $props();

	let { id, from, to, value, timestamp, type, txExplorerUrl, fromExplorerUrl, toExplorerUrl } =
		$derived(transaction);
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.transaction.text.details}</svelte:fragment>

	<ContentWithToolbar>
		<ModalHero variant={type === 'receive' ? 'success' : 'default'}>
			{#snippet logo()}
				{#if nonNullish(token)}
					<TokenLogo logoSize="lg" data={token} badge={{ type: 'network' }} />
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

		{#if nonNullish(to) && nonNullish(from)}
			<TransactionContactCard
				type={type === 'receive' ? 'receive' : 'send'}
				{to}
				{from}
				{toExplorerUrl}
				{fromExplorerUrl}
			/>
		{/if}

		<List styleClass="mt-5">
			{#if type === 'receive' && nonNullish(to)}
				<ListItem>
					<span>{$i18n.transaction.text.to}</span>
					<output class="flex max-w-[50%] flex-row">
						<output>{shortenWithMiddleEllipsis({ text: to })}</output>
						<TransactionAddressActions
							copyAddress={to}
							copyAddressText={$i18n.transaction.text.to_copied}
							explorerUrl={toExplorerUrl}
							explorerUrlAriaLabel={$i18n.transaction.alt.open_to_block_explorer}
						/>
					</output>
				</ListItem>
			{/if}
			{#if type === 'send' && nonNullish(from)}
				<ListItem>
					<span>{$i18n.transaction.text.from}</span>
					<output class="flex max-w-[50%] flex-row">
						<output>{shortenWithMiddleEllipsis({ text: from })}</output>
						<TransactionAddressActions
							copyAddress={from}
							copyAddressText={$i18n.transaction.text.from_copied}
							explorerUrl={fromExplorerUrl}
							explorerUrlAriaLabel={$i18n.transaction.alt.open_from_block_explorer}
						/>
					</output>
				</ListItem>
			{/if}

			{#if nonNullish(timestamp)}
				<ListItem>
					<span>{$i18n.transaction.text.timestamp}</span>
					<output>{formatNanosecondsToDate(timestamp)}</output>
				</ListItem>
			{/if}

			{#if nonNullish(token)}
				<ListItem>
					<span>{$i18n.networks.network}</span>
					<span><NetworkWithLogo network={token.network} logo="start" /></span>
				</ListItem>
			{/if}

			<ListItem>
				<span>{$i18n.transaction.text.id}</span>
				<span>
					<output>{id}</output>

					<TransactionAddressActions
						copyAddress={`${id}`}
						copyAddressText={$i18n.transaction.text.id_copied}
						explorerUrl={txExplorerUrl}
						explorerUrlAriaLabel={$i18n.transaction.alt.open_block_explorer}
					/>
				</span>
			</ListItem>
		</List>

		<ButtonCloseModal slot="toolbar" />
	</ContentWithToolbar>
</Modal>
