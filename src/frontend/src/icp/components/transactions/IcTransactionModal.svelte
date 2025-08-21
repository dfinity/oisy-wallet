<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
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
	import { formatNanosecondsToDate, formatToken } from '$lib/utils/format.utils';

	interface Props {
		transaction: IcTransactionUi;
		token: OptionToken;
	}

	const { transaction, token }: Props = $props();

	let { id, from, to, value, timestamp, type, txExplorerUrl, fromExplorerUrl, toExplorerUrl } =
		$derived(transaction);

	const onSaveAddressComplete = (data: OpenTransactionParams<AnyTransactionUi>) => {
		modalStore.openIcTransaction({
			id: Symbol(),
			data: data as OpenTransactionParams<IcTransactionUi>
		});
	};
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.transaction.text.details}</svelte:fragment>

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

		{#if nonNullish(to) && nonNullish(from)}
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
			{#if nonNullish(timestamp)}
				<ListItem>
					<span>{$i18n.transaction.text.timestamp}</span>
					<output
						>{formatNanosecondsToDate({
							nanoseconds: timestamp,
							language: $currentLanguage
						})}</output
					>
				</ListItem>
			{/if}

			{#if nonNullish(token)}
				<ListItem>
					<span>{$i18n.networks.network}</span>
					<span><NetworkWithLogo logo="start" network={token.network} /></span>
				</ListItem>
			{/if}

			<ListItem>
				<span>{$i18n.transaction.text.id}</span>
				<span>
					<output>{id}</output>

					<AddressActions
						copyAddress={`${id}`}
						copyAddressText={$i18n.transaction.text.id_copied}
						externalLink={txExplorerUrl}
						externalLinkAriaLabel={$i18n.transaction.alt.open_block_explorer}
					/>
				</span>
			</ListItem>
		</List>

		{#snippet toolbar()}
			<ButtonCloseModal />
		{/snippet}
	</ContentWithToolbar>
</Modal>
