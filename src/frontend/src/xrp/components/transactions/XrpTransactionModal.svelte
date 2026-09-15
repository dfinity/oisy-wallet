<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TransactionContactCard from '$lib/components/transactions/TransactionContactCard.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore, type OpenTransactionParams } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import type { AnyTransactionUi } from '$lib/types/transaction-ui';
	import {
		formatSecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkXrp } from '$lib/utils/network.utils';
	import type { XrpTransactionUi } from '$xrp/types/xrp-transaction';

	interface Props {
		transaction: XrpTransactionUi;
		token: OptionToken;
	}

	const { transaction, token }: Props = $props();

	let { from, value, timestamp, id, blockNumber, to, type, status, destinationTag } =
		$derived(transaction);

	// XRPScan explorer URLs are built directly: unlike other chains its base URL carries no
	// `$args` placeholder, so `tx/`/`account/` paths are appended here.
	let explorerUrl: string | undefined = $derived(
		isNetworkXrp(token?.network) ? token.network.explorerUrl : undefined
	);

	let txExplorerUrl: string | undefined = $derived(
		nonNullish(explorerUrl) ? `${explorerUrl}/tx/${id}` : undefined
	);

	let toExplorerUrl: string | undefined = $derived(
		nonNullish(explorerUrl) && nonNullish(to) ? `${explorerUrl}/account/${to}` : undefined
	);

	let fromExplorerUrl: string | undefined = $derived(
		nonNullish(explorerUrl) ? `${explorerUrl}/account/${from}` : undefined
	);

	const onSaveAddressComplete = (data: OpenTransactionParams<AnyTransactionUi>) => {
		modalStore.openXrpTransaction({
			id: Symbol(),
			data: data as OpenTransactionParams<XrpTransactionUi>
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
			{#if nonNullish(token?.network)}
				<ListItem>
					<span>
						{$i18n.networks.network}
					</span>

					<NetworkWithLogo network={token.network} />
				</ListItem>
			{/if}

			{#if nonNullish(destinationTag)}
				<ListItem>
					<span>{$i18n.send.text.xrp_destination_tag}</span>

					<output>{destinationTag}</output>
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
		</List>

		{#snippet toolbar()}
			<ButtonCloseModal />
		{/snippet}
	</ContentWithToolbar>
</Modal>
