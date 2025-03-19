<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import type { BigNumber } from '@ethersproject/bignumber';
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
		formatSecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkIdSepolia } from '$lib/utils/network.utils';

	export let transaction: EthTransactionUi;
	export let token: OptionToken;

	let from: string;
	let to: string | undefined;
	let value: BigNumber;
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
				{#if nonNullish(explorerUrl)}
					<ExternalLink
						iconSize="18"
						href={explorerUrl}
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
		</Value>

		{#if nonNullish(to) && nonNullish(toDisplay)}
			<Value ref="to">
				<svelte:fragment slot="label">{$i18n.transaction.text.interacted_with}</svelte:fragment>
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
