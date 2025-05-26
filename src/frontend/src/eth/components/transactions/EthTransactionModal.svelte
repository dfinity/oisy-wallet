<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
	import EthTransactionStatus from '$eth/components/transactions/EthTransactionStatus.svelte';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import { explorerUrl as explorerUrlStore } from '$eth/derived/network.derived';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import { mapAddressToName } from '$eth/utils/transactions.utils';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionString } from '$lib/types/string';
	import type { OptionToken } from '$lib/types/token';
	import {
		formatNanosecondsToDate,
		formatSecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkIdSepolia } from '$lib/utils/network.utils';
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TransactionContactCard from '$lib/components/transactions/TransactionContactCard.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';

	export let transaction: EthTransactionUi;
	export let token: OptionToken;

	let from: string;
	let to: string | undefined;
	let value: bigint;
	let timestamp: number | undefined;
	let hash: string | undefined;
	let blockNumber: number | undefined;

	$: ({ from, value, timestamp, hash, blockNumber, to, type } = transaction);

	let explorerUrl: string | undefined;
	$: explorerUrl = notEmptyString(hash) ? `${$explorerUrlStore}/tx/${hash}` : undefined;

	let fromExplorerUrl: string;
	$: fromExplorerUrl = `${$explorerUrlStore}/address/${from}`;

	let toExplorerUrl: string | undefined;
	$: toExplorerUrl = notEmptyString(to) ? `${$explorerUrlStore}/address/${to}` : undefined;

	let ckMinterInfo: OptionCertifiedMinterInfo;
	$: ckMinterInfo =
		$ckEthMinterInfoStore?.[
			isNetworkIdSepolia(token?.network.id) ? SEPOLIA_TOKEN_ID : ETHEREUM_TOKEN_ID
		];

	let fromDisplay: OptionString;
	$: fromDisplay = nonNullish(token)
		? (mapAddressToName({
				address: from,
				networkId: token.network.id,
				erc20Tokens: $erc20Tokens,
				ckMinterInfo
			}) ?? from)
		: from;

	let toDisplay: OptionString;
	$: toDisplay = nonNullish(token)
		? (mapAddressToName({
				address: to,
				networkId: token.network.id,
				erc20Tokens: $erc20Tokens,
				ckMinterInfo
			}) ?? to)
		: to;
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
						<output class="truncate">{to}</output>
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
						<output class="truncate">{from}</output>
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

			{#if nonNullish(hash)}
				<li class="border-b-1 flex flex-row justify-between border-brand-subtle-10 py-1.5">
					<span>{$i18n.transaction.text.hash}</span>
					<span>
						<output>{shortenWithMiddleEllipsis({ text: hash })}</output>
						<Copy
							value={hash}
							text={replacePlaceholders($i18n.transaction.text.hash_copied, {
								$hash: hash
							})}
							inline
						/>
						{#if nonNullish(explorerUrl)}
							<ExternalLink
								iconSize="18"
								href={explorerUrl}
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
					<span>{$i18n.transaction.text.block}</span>
					<span>
						<output>{blockNumber}</output>

						<EthTransactionStatus {blockNumber} />
					</span>
				</li>
			{/if}

			{#if nonNullish(timestamp)}
				<li class="border-b-1 flex flex-row justify-between border-brand-subtle-10 py-1.5">
					<span>{$i18n.transaction.text.timestamp}</span>
					<output>{formatSecondsToDate(timestamp)}</output>
				</li>
			{/if}
			<!--
			<Value ref="from">
				{#snippet label()}
					{$i18n.transaction.text.from}
				{/snippet}
				{#snippet content()}
					<output>{fromDisplay}</output>
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
				{/snippet}
			</Value>

			{#if nonNullish(to) && nonNullish(toDisplay)}
				<Value ref="to">
					{#snippet label()}
						{$i18n.transaction.text.interacted_with}
					{/snippet}
					{#snippet content()}
						<output>{toDisplay}</output>
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
					{/snippet}
				</Value>
			{/if}
			-->

			{#if nonNullish(token)}
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
