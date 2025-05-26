<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Commitment } from '@solana/kit';
	import TransactionModal from '$lib/components/transactions/TransactionModal.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionToken } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkSolana } from '$lib/utils/network.utils';
	import type { SolTransactionType, SolTransactionUi } from '$sol/types/sol-transaction';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		formatSecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import TransactionContactCard from '$lib/components/transactions/TransactionContactCard.svelte';
	import { Modal } from '@dfinity/gix-components';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';

	export let transaction: SolTransactionUi;
	export let token: OptionToken;

	let from: string;
	let to: string | undefined;
	let type: SolTransactionType;
	let value: bigint | undefined;
	let timestamp: bigint | undefined;
	let id: string;
	let status: Commitment | null;

	let explorerUrl: string | undefined;
	$: explorerUrl = isNetworkSolana(token?.network) ? token.network.explorerUrl : undefined;

	$: ({ from, value, timestamp, signature: id, blockNumber, to, type, status } = transaction);

	let txExplorerUrl: string | undefined;
	$: txExplorerUrl = nonNullish(explorerUrl)
		? replacePlaceholders(explorerUrl, { $args: `tx/${id}/` })
		: undefined;

	let toExplorerUrl: string | undefined;
	$: toExplorerUrl = nonNullish(explorerUrl)
		? replacePlaceholders(explorerUrl, { $args: `account/${to}/` })
		: undefined;

	let fromExplorerUrl: string | undefined;
	$: fromExplorerUrl = nonNullish(explorerUrl)
		? replacePlaceholders(explorerUrl, { $args: `account/${from}/` })
		: undefined;
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
			<TransactionContactCard
				type={type === 'receive' ? 'receive' : 'send'}
				{to}
				{from}
				{toExplorerUrl}
				{fromExplorerUrl}
			/>
		{/if}

		<ul class="mt-5">
			{#if type === 'receive' && nonNullish(to)}
				<li class="border-b-1 flex flex-row justify-between border-brand-subtle-10 py-1.5">
					<span>{$i18n.transaction.text.to}</span>
					<output class="flex max-w-[50%] flex-row">
						<output>{shortenWithMiddleEllipsis({ text: to })}</output>
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
					</output>
				</li>
			{/if}
			{#if type === 'send' && nonNullish(from)}
				<li class="border-b-1 flex flex-row justify-between border-brand-subtle-10 py-1.5">
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
				</li>
			{/if}

			{#if nonNullish(id)}
				<li class="border-b-1 flex flex-row justify-between border-brand-subtle-10 py-1.5">
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
				</li>
			{/if}

			{#if nonNullish(blockNumber)}
				<li class="border-b-1 flex flex-row justify-between border-brand-subtle-10 py-1.5">
					<span>
						{$i18n.transaction.text.block}
					</span>

					<output>{blockNumber}</output>
				</li>
			{/if}

			{#if nonNullish(status)}
				<li class="border-b-1 flex flex-row justify-between border-brand-subtle-10 py-1.5">
					<span>
						{$i18n.transaction.text.status}
					</span>
					<span>
						{`${$i18n.transaction.status[status]}`}
					</span>
				</li>
			{/if}

			{#if nonNullish(timestamp)}
				<li class="border-b-1 flex flex-row justify-between border-brand-subtle-10 py-1.5">
					<span>
						{$i18n.transaction.text.timestamp}
					</span>

					<output>{formatSecondsToDate(Number(timestamp))}</output>
				</li>
			{/if}

			{#if nonNullish(value) && nonNullish(token)}
				<li class="border-b-1 flex flex-row justify-between border-brand-subtle-10 py-1.5">
					<span>{$i18n.core.text.amount}</span>

					<output>
						{formatToken({
							value,
							unitName: token.decimals,
							displayDecimals: token.decimals
						})}
						{token.symbol}
					</output>
				</li>
			{/if}
		</ul>

		<ButtonCloseModal slot="toolbar" />
	</ContentWithToolbar>
</Modal>
