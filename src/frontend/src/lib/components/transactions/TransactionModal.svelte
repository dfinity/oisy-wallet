<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { BigNumber } from '@ethersproject/bignumber';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import type { TransactionUiCommon } from '$lib/types/transaction';
	import {
		formatSecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let commonData: TransactionUiCommon;
	export let hash: string | undefined;
	export let value: BigNumber | undefined;
	export let token: OptionToken;
	export let typeLabel: string;
	export let sendToLabel: string | undefined;

	let from: string;
	let to: string | undefined;
	let timestamp: bigint | undefined;
	let blockNumber: number | undefined;
	let txExplorerUrl: string | undefined;
	let fromExplorerUrl: string | undefined;
	let toExplorerUrl: string | undefined;
	$: ({ from, blockNumber, timestamp, to, fromExplorerUrl, toExplorerUrl, txExplorerUrl } =
		commonData);
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.transaction.text.details}</svelte:fragment>

	<ContentWithToolbar>
		{#if nonNullish(hash)}
			<Value ref="hash">
				<svelte:fragment slot="label">{$i18n.transaction.text.hash}</svelte:fragment>
				<output>{shortenWithMiddleEllipsis({ text: hash })}</output>
				<Copy
					value={hash}
					text={replacePlaceholders($i18n.transaction.text.hash_copied, {
						$hash: hash
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
			</Value>
		{/if}

		{#if nonNullish(blockNumber)}
			<Value ref="blockNumber">
				<svelte:fragment slot="label">{$i18n.transaction.text.block}</svelte:fragment>
				<output>{blockNumber}</output>
			</Value>
		{/if}

		<slot name="transaction-status" />

		<slot name="transaction-confirmations" />

		{#if nonNullish(timestamp)}
			<Value ref="timestamp">
				<svelte:fragment slot="label">{$i18n.transaction.text.timestamp}</svelte:fragment>
				<output>{formatSecondsToDate(Number(timestamp))}</output>
			</Value>
		{/if}

		<Value ref="type">
			<svelte:fragment slot="label">{$i18n.transaction.text.type}</svelte:fragment>
			<p class="first-letter:capitalize">{typeLabel}</p>
		</Value>

		<Value ref="from">
			<svelte:fragment slot="label">{$i18n.transaction.text.from}</svelte:fragment>
			<output>{from}</output>
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
		</Value>

		{#if nonNullish(to)}
			<Value ref="to">
				<svelte:fragment slot="label">{sendToLabel}</svelte:fragment>
				<output>{to}</output>
				<Copy value={to} text={$i18n.transaction.text.to_copied} inline />
				{#if nonNullish(toExplorerUrl)}
					<ExternalLink
						iconSize="18"
						href={toExplorerUrl}
						ariaLabel={$i18n.transaction.alt.open_to_block_explorer}
						inline
						color="blue"
					/>
				{/if}
			</Value>
		{/if}

		{#if nonNullish(value) && nonNullish(token)}
			<Value ref="amount">
				<svelte:fragment slot="label">{$i18n.core.text.amount}</svelte:fragment>
				<output>
					{formatToken({
						value: value.toBigInt(),
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
