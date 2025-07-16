<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
	import EthTransactionStatus from '$eth/components/transactions/EthTransactionStatus.svelte';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import { getExplorerUrl } from '$eth/utils/eth.utils';
	import { mapAddressToName } from '$eth/utils/transactions.utils';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TransactionAddressActions from '$lib/components/transactions/TransactionAddressActions.svelte';
	import TransactionContactCard from '$lib/components/transactions/TransactionContactCard.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore, type OpenTransactionParams } from '$lib/stores/modal.store';
	import type { OptionString } from '$lib/types/string';
	import type { OptionToken } from '$lib/types/token';
	import type { AnyTransactionUi } from '$lib/types/transaction';
	import {
		formatSecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkIdSepolia } from '$lib/utils/network.utils';
	import { currentLanguage } from '$lib/derived/i18n.derived';

	interface Props {
		transaction: EthTransactionUi;
		token: OptionToken;
	}

	const { transaction, token }: Props = $props();

	let { from, value, timestamp, hash, blockNumber, to, type } = $derived(transaction);

	let explorerBaseUrl = $derived(getExplorerUrl({ token }));

	let explorerUrl: string | undefined = $derived(
		notEmptyString(hash) ? `${explorerBaseUrl}/tx/${hash}` : undefined
	);

	let fromExplorerUrl: string = $derived(`${explorerBaseUrl}/address/${from}`);

	let toExplorerUrl: string | undefined = $derived(
		notEmptyString(to) ? `${explorerBaseUrl}/address/${to}` : undefined
	);

	let ckMinterInfo: OptionCertifiedMinterInfo = $derived(
		$ckEthMinterInfoStore?.[
			isNetworkIdSepolia(token?.network.id) ? SEPOLIA_TOKEN_ID : ETHEREUM_TOKEN_ID
		]
	);

	let fromDisplay: OptionString = $derived(
		nonNullish(token)
			? (mapAddressToName({
					address: from,
					networkId: token.network.id,
					erc20Tokens: $erc20Tokens,
					ckMinterInfo
				}) ?? from)
			: from
	);

	const toDisplay: OptionString = $derived(
		nonNullish(token)
			? (mapAddressToName({
					address: to,
					networkId: token.network.id,
					erc20Tokens: $erc20Tokens,
					ckMinterInfo
				}) ?? to)
			: to
	);

	const onSaveAddressComplete = (data: OpenTransactionParams<AnyTransactionUi>) => {
		modalStore.openEthTransaction({
			id: Symbol(),
			data: data as OpenTransactionParams<EthTransactionUi>
		});
	};
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
				{onSaveAddressComplete}
			/>
		{/if}

		<List styleClass="mt-5">
			{#if nonNullish(hash)}
				<ListItem>
					<span>{$i18n.transaction.text.hash}</span>
					<span>
						<output>{shortenWithMiddleEllipsis({ text: hash })}</output>

						<TransactionAddressActions
							copyAddress={hash}
							copyAddressText={replacePlaceholders($i18n.transaction.text.hash_copied, {
								$hash: hash
							})}
							{explorerUrl}
							explorerUrlAriaLabel={$i18n.transaction.alt.open_block_explorer}
						/>
					</span>
				</ListItem>
			{/if}

			{#if nonNullish(blockNumber) && nonNullish(token)}
				<ListItem>
					<span>{$i18n.transaction.text.block}</span>
					<span>
						<output>{blockNumber}</output>
					</span>
				</ListItem>

				<ListItem>
					<EthTransactionStatus {blockNumber} {token} />
				</ListItem>
			{/if}

			{#if nonNullish(timestamp)}
				<ListItem>
					<span>{$i18n.transaction.text.timestamp}</span>
					<output>{formatSecondsToDate({ seconds: Number(timestamp), language: $currentLanguage })}</output>
				</ListItem>
			{/if}

			{#if nonNullish(from) && nonNullish(fromDisplay) && from !== fromDisplay}
				<ListItem>
					<span>{$i18n.transaction.text.from}</span>
					<span class="flex max-w-[50%] flex-row break-all">
						<output>{fromDisplay}</output>

						<TransactionAddressActions
							copyAddress={fromDisplay}
							copyAddressText={$i18n.transaction.text.from_copied}
							explorerUrl={fromExplorerUrl}
							explorerUrlAriaLabel={$i18n.transaction.alt.open_from_block_explorer}
						/>
					</span>
				</ListItem>
			{/if}

			{#if nonNullish(to) && nonNullish(toDisplay) && to !== toDisplay}
				<ListItem>
					<span>{$i18n.transaction.text.interacted_with}</span>

					<span class="flex max-w-[50%] flex-row break-all">
						<output>{toDisplay}</output>

						<TransactionAddressActions
							copyAddress={toDisplay}
							copyAddressText={$i18n.transaction.text.to_copied}
							explorerUrl={toExplorerUrl}
							explorerUrlAriaLabel={$i18n.transaction.alt.open_to_block_explorer}
						/>
					</span>
				</ListItem>
			{/if}

			{#if nonNullish(token)}
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
