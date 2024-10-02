<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { BigNumber } from '@ethersproject/bignumber';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		formatSecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let from: string;
	export let typeLabel: string;
	export let to: string | undefined;
	export let value: BigNumber | undefined;
	export let timestamp: number | undefined;
	export let hash: string | undefined;
	export let blockNumber: number | undefined;
	export let txExplorerUrl: string | undefined;
	export let fromExplorerUrl: string | undefined;
	export let toExplorerUrl: string | undefined;
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
				/>{#if nonNullish(txExplorerUrl)}<ExternalLink
						iconSize="18"
						href={txExplorerUrl}
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
		{/if}

		<slot name="transaction-status" />

		{#if nonNullish(timestamp)}
			<Value ref="timestamp">
				<svelte:fragment slot="label">{$i18n.transaction.text.timestamp}</svelte:fragment>
				<output>{formatSecondsToDate(timestamp)}</output>
			</Value>
		{/if}

		<Value ref="type">
			<svelte:fragment slot="label">{$i18n.transaction.text.type}</svelte:fragment>
			<p class="first-letter:capitalize">{typeLabel}</p>
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

		{#if nonNullish(value)}
			<Value ref="amount">
				<svelte:fragment slot="label">{$i18n.core.text.amount}</svelte:fragment>
				<output>
					{formatToken({
						value,
						unitName: $tokenWithFallback.decimals,
						displayDecimals: $tokenWithFallback.decimals
					})}
					{$tokenWithFallback.symbol}
				</output>
			</Value>
		{/if}

		<button class="primary full center text-center" on:click={modalStore.close} slot="toolbar"
			>{$i18n.core.text.close}</button
		>
	</ContentWithToolbar>
</Modal>
