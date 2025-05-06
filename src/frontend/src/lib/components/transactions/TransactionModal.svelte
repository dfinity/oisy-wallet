<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import TransactionAddress from '$lib/components/transactions/TransactionAddress.svelte';
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
	export let value: bigint | undefined;
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
				{#snippet label()}
					{$i18n.transaction.text.hash}
				{/snippet}

				{#snippet content()}
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
				{/snippet}
			</Value>
		{/if}

		{#if nonNullish(blockNumber)}
			<Value ref="blockNumber">
				{#snippet label()}
					{$i18n.transaction.text.block}
				{/snippet}

				{#snippet content()}
					<output>{blockNumber}</output>
				{/snippet}
			</Value>
		{/if}

		<slot name="transaction-status" />

		<slot name="transaction-confirmations" />

		{#if nonNullish(timestamp)}
			<Value ref="timestamp">
				{#snippet label()}
					{$i18n.transaction.text.timestamp}
				{/snippet}

				{#snippet content()}
					<output>{formatSecondsToDate(Number(timestamp))}</output>
				{/snippet}
			</Value>
		{/if}

		<Value ref="type">
			{#snippet label()}
				{$i18n.transaction.text.type}
			{/snippet}

			{#snippet content()}
				<p class="first-letter:capitalize">{typeLabel}</p>
			{/snippet}
		</Value>

		<Value ref="from">
			{#snippet label()}{$i18n.transaction.text.from}{/snippet}

			{#snippet content()}
				<TransactionAddress
					address={from}
					explorerUrl={fromExplorerUrl}
					copiedText={$i18n.transaction.text.from_copied}
				/>
			{/snippet}
		</Value>

		<slot name="transaction-custom-to" />

		{#if nonNullish(to)}
			<Value ref="to">
				{#snippet label()}
					{sendToLabel}
				{/snippet}

				{#snippet content()}
					<TransactionAddress
						address={to}
						explorerUrl={toExplorerUrl}
						copiedText={$i18n.transaction.text.to_copied}
					/>
				{/snippet}
			</Value>
		{/if}

		{#if nonNullish(value) && nonNullish(token)}
			<Value ref="amount">
				{#snippet label()}
					{$i18n.core.text.amount}
				{/snippet}

				{#snippet content()}
					<output>
						{formatToken({
							value,
							unitName: token.decimals,
							displayDecimals: token.decimals
						})}
						{token.symbol}
					</output>
				{/snippet}
			</Value>
		{/if}

		<ButtonCloseModal slot="toolbar" />
	</ContentWithToolbar>
</Modal>
