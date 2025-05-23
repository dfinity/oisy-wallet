<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import IcTransactionLabel from '$icp/components/transactions/IcTransactionLabel.svelte';
	import type { IcTransactionType, IcTransactionUi } from '$icp/types/ic-transaction';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import { formatNanosecondsToDate, formatToken } from '$lib/utils/format.utils';

	export let transaction: IcTransactionUi;
	export let token: OptionToken;

	let id: bigint | string;
	let from: string | undefined;
	let to: string | undefined;
	let value: bigint | undefined;
	let timestamp: bigint | undefined;
	let type: IcTransactionType;
	let toLabel: string | undefined;
	let fromLabel: string | undefined;
	let txExplorerUrl: string | undefined;
	let fromExplorerUrl: string | undefined;
	let toExplorerUrl: string | undefined;

	$: ({
		id,
		from,
		to,
		value,
		timestamp,
		type,
		toLabel,
		fromLabel,
		txExplorerUrl,
		fromExplorerUrl,
		toExplorerUrl
	} = transaction);
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.transaction.text.details}</svelte:fragment>

	<ContentWithToolbar>
		<Value ref="id" element="div">
			{#snippet label()}
				{$i18n.transaction.text.id}
			{/snippet}
			{#snippet content()}
				<output>{id}</output>
				<Copy value={`${id}`} text={$i18n.transaction.text.id_copied} inline />
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

		{#if nonNullish(timestamp)}
			<Value ref="timestamp">
				{#snippet label()}
					{$i18n.transaction.text.timestamp}
				{/snippet}
				{#snippet content()}
					<output>{formatNanosecondsToDate(timestamp)}</output>
				{/snippet}
			</Value>
		{/if}

		<Value ref="type" element="div">
			{#snippet label()}
				{$i18n.transaction.text.type}
			{/snippet}

			{#snippet content()}
				<p class="first-letter:capitalize">{type}</p>
			{/snippet}
		</Value>

		{#if nonNullish(from) || nonNullish(fromLabel)}
			<Value ref="from" element="div">
				{#snippet label()}
					{$i18n.transaction.text.from}
				{/snippet}

				{#snippet content()}
					{#if nonNullish(fromLabel)}
						<p class="mb-0.5 first-letter:capitalize">
							<IcTransactionLabel label={fromLabel} {token} />
						</p>
					{/if}

					{#if nonNullish(from)}
						<p>
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
						</p>
					{/if}
				{/snippet}
			</Value>
		{/if}

		{#if nonNullish(to) || nonNullish(toLabel)}
			<Value ref="to" element="div">
				{#snippet label()}
					{$i18n.transaction.text.to}
				{/snippet}

				{#snippet content()}
					{#if nonNullish(toLabel)}
						<p class="mb-0.5 first-letter:capitalize">
							<IcTransactionLabel label={toLabel} {token} />
						</p>
					{/if}

					{#if nonNullish(to)}
						<p>
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
						</p>
					{/if}
				{/snippet}
			</Value>
		{/if}

		{#if nonNullish(value)}
			<Value ref="amount">
				{#snippet label()}
					{$i18n.core.text.amount}
				{/snippet}
				{#snippet content()}
					{#if nonNullish(token)}
						<output>
							{formatToken({
								value,
								unitName: token.decimals,
								displayDecimals: token.decimals
							})}
							{token.symbol}
						</output>
					{:else}
						&ZeroWidthSpace;
					{/if}
				{/snippet}
			</Value>
		{/if}

		<ButtonCloseModal slot="toolbar" />
	</ContentWithToolbar>
</Modal>
