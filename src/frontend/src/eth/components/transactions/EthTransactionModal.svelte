<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import type { BigNumber } from '@ethersproject/bignumber';
	import EthTransactionStatus from '$eth/components/transactions/EthTransactionStatus.svelte';
	import { explorerUrl as explorerUrlStore } from '$eth/derived/network.derived';
	import type { EthTransactionType } from '$eth/types/eth-transaction';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import type { Transaction } from '$lib/types/transaction';
	import {
		formatSecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let transaction: Transaction;
	export let token: OptionToken;

	let from: string;
	let to: string | undefined;
	let value: BigNumber;
	let timestamp: number | undefined;
	let hash: string | undefined;
	let blockNumber: number | undefined;

	$: ({ from, value, timestamp, hash, blockNumber, to } = transaction);

	let type: EthTransactionType;
	$: type = from?.toLowerCase() === $ethAddress?.toLowerCase() ? 'send' : 'receive';

	let explorerUrl: string | undefined;
	$: explorerUrl = notEmptyString(hash) ? `${$explorerUrlStore}/tx/${hash}` : undefined;

	let fromExplorerUrl: string;
	$: fromExplorerUrl = `${$explorerUrlStore}/address/${from}`;

	let toExplorerUrl: string | undefined;
	$: toExplorerUrl = notEmptyString(to) ? `${$explorerUrlStore}/address/${to}` : undefined;
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.transaction.text.details}</svelte:fragment>

	<ContentWithToolbar>
		{#if nonNullish(hash)}
			<Value ref="hash">
				<svelte:fragment slot="label">{$i18n.transaction.text.hash}</svelte:fragment>
				<output>{shortenWithMiddleEllipsis({ text: hash })}</output><Copy
					value={hash}
					text={replacePlaceholders($i18n.transaction.text.hash_copied, {
						$hash: hash
					})}
					inline
				/>{#if nonNullish(explorerUrl)}<ExternalLink
						iconSize="18"
						href={explorerUrl}
						ariaLabel={$i18n.transaction.alt.open_block_explorer}
						inline
						color="blue"
					/>{/if}
			</Value>
		{/if}

		{#if nonNullish(blockNumber)}
			<Value ref="blockNumber">
				<svelte:fragment slot="label">{$i18n.transaction.text.block}</svelte:fragment>
				<output>{blockNumber}</output>
			</Value>

			<EthTransactionStatus {blockNumber} />
		{/if}

		{#if nonNullish(timestamp)}
			<Value ref="timestamp">
				<svelte:fragment slot="label">{$i18n.transaction.text.timestamp}</svelte:fragment>
				<output>{formatSecondsToDate(timestamp)}</output>
			</Value>
		{/if}

		<Value ref="type">
			<svelte:fragment slot="label">{$i18n.transaction.text.type}</svelte:fragment>
			{`${type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive}`}
		</Value>

		<Value ref="from">
			<svelte:fragment slot="label">{$i18n.transaction.text.from}</svelte:fragment>
			<output>{from}</output><Copy
				value={from}
				text={$i18n.transaction.text.from_copied}
				inline
			/>{#if nonNullish(fromExplorerUrl)}<ExternalLink
					iconSize="18"
					href={fromExplorerUrl}
					ariaLabel={$i18n.transaction.alt.open_from_block_explorer}
					inline
					color="blue"
				/>{/if}
		</Value>

		{#if nonNullish(to)}
			<Value ref="to">
				<svelte:fragment slot="label">{$i18n.transaction.text.interacted_with}</svelte:fragment>
				<output>{to}</output><Copy
					value={to}
					text={$i18n.transaction.text.to_copied}
					inline
				/>{#if nonNullish(toExplorerUrl)}<ExternalLink
						iconSize="18"
						href={toExplorerUrl}
						ariaLabel={$i18n.transaction.alt.open_to_block_explorer}
						inline
						color="blue"
					/>{/if}
			</Value>
		{/if}

		{#if nonNullish(token)}
			<Value ref="amount">
				<svelte:fragment slot="label">{$i18n.core.text.amount}</svelte:fragment>
				<output>
					{formatToken({
						value,
						unitName: token.decimals,
						displayDecimals: token.decimals
					})}
					{token.symbol}
				</output>
			</Value>
		{/if}

		<ButtonCloseModal slot="toolbar" />
	</ContentWithToolbar>
</Modal>
