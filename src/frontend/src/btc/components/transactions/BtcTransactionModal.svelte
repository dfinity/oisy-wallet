<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { BtcTransactionStatus, BtcTransactionUi } from '$btc/types/btc';
	import type { BtcTransactionType } from '$btc/types/btc-transaction';
	import { BTC_MAINNET_EXPLORER_URL, BTC_TESTNET_EXPLORER_URL } from '$env/explorers.env';
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TransactionContactCard from '$lib/components/transactions/TransactionContactCard.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import {
		formatSecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkIdBTCTestnet, isNetworkIdBTCRegtest } from '$lib/utils/network.utils';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';

	export let transaction: BtcTransactionUi;
	export let token: OptionToken;

	let from: string;
	let to: string[] | undefined;
	let type: BtcTransactionType;
	let value: bigint | undefined;
	let timestamp: bigint | undefined;
	let id: string;
	let blockNumber: number | undefined;
	let confirmations: number | undefined;
	let status: BtcTransactionStatus;

	let explorerUrl: string | undefined;
	$: explorerUrl = isNetworkIdBTCTestnet(token?.network.id)
		? BTC_TESTNET_EXPLORER_URL
		: isNetworkIdBTCRegtest(token?.network.id)
			? undefined
			: BTC_MAINNET_EXPLORER_URL;

	$: ({ from, value, timestamp, id, blockNumber, to, type, status, confirmations } = transaction);

	let txExplorerUrl: string | undefined;
	$: txExplorerUrl = nonNullish(explorerUrl) ? `${explorerUrl}/tx/${id}` : undefined;

	let fromExplorerUrl: string | undefined;
	$: fromExplorerUrl =
		nonNullish(explorerUrl) && nonNullish(from) ? `${explorerUrl}/address/${from}` : undefined;
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.transaction.text.details}</svelte:fragment>

	<ContentWithToolbar>
		<ModalHero variant={type === 'receive' ? 'success' : 'default'}>
			{#snippet logo()}
				{#if nonNullish(token)}
					<div class="relative block flex w-[54px]">
						<TokenLogo logoSize="lg" data={token} badge={{ type: 'network' }} />
					</div>
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
			{#each to as address, index (`${address}-${index}`)}
				<TransactionContactCard
					type={type === 'receive' ? 'receive' : 'send'}
					to={address}
					{from}
					toExplorerUrl={nonNullish(explorerUrl) ? `${explorerUrl}/address/${address}` : undefined}
					{fromExplorerUrl}
				/>
			{/each}
		{/if}

		<List styleClass="mt-5">
			{#if type === 'receive' && nonNullish(to)}
				<ListItem>
					<span>{$i18n.transaction.text.to}</span>
					<output class="flex max-w-[50%] flex-row">
						{#each to as address, index (`${address}-${index}`)}
							<span>
								<output>{shortenWithMiddleEllipsis({ text: address })}</output>
								<Copy value={address} text={$i18n.transaction.text.to_copied} inline />
								{#if nonNullish(explorerUrl)}
									<ExternalLink
										iconSize="18"
										href={`${explorerUrl}/address/${address}`}
										ariaLabel={$i18n.transaction.alt.open_to_block_explorer}
										inline
										color="blue"
									/>
								{/if}
							</span>
						{/each}
					</output>
				</ListItem>
			{/if}
			{#if type === 'send' && nonNullish(from)}
				<ListItem>
					<span>{$i18n.transaction.text.from}</span>
					<output class="flex max-w-[50%] flex-row">
						<output>{shortenWithMiddleEllipsis({ text: from })}</output>
						<Copy value={from} text={$i18n.transaction.text.from_copied} inline />
						{#if nonNullish(fromExplorerUrl)}
							<ExternalLink
								iconSize="18"
								href={fromExplorerUrl}
								ariaLabel={$i18n.transaction.alt.open_from_block_explorer}
								inline
								color="blue"
							/>
						{/if}
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
						<Copy
							value={id}
							text={replacePlaceholders($i18n.transaction.text.hash_copied, {
								$hash: id
							})}
							inline
						/>
						{#if nonNullish(txExplorerUrl)}
							<ExternalLink
								iconSize="18"
								href={txExplorerUrl}
								ariaLabel={$i18n.transaction.alt.open_block_explorer}
								inline
								color="blue"
							/>
						{/if}
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

			{#if nonNullish(confirmations)}
				<ListItem>
					<span>
						{$i18n.transaction.text.confirmations}
					</span>
					<span>{confirmations}</span>
				</ListItem>
			{/if}

			<ListItem>
				<span>
					{$i18n.transaction.text.status}
				</span>
				<span>
					{`${$i18n.transaction.status[status]}`}
				</span>
			</ListItem>

			{#if nonNullish(timestamp)}
				<ListItem>
					<span>
						{$i18n.transaction.text.timestamp}
					</span>

					<output>{formatSecondsToDate(Number(timestamp))}</output>
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

		<ButtonCloseModal slot="toolbar" />
	</ContentWithToolbar>
</Modal>
