<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TransactionContactCard from '$lib/components/transactions/TransactionContactCard.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore, type OpenTransactionParams } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import type { AnyTransactionUi } from '$lib/types/transaction-ui';
	import { absBigInt } from '$lib/utils/bigint.utils';
	import {
		formatSecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkSolana } from '$lib/utils/network.utils';
	import SolInstructionsList from '$sol/components/transactions/SolInstructionsList.svelte';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';
	import type { SolNetBalanceChange } from '$sol/types/sol-transaction-summary';
	import { solAccountExplorerUrl } from '$sol/utils/sol-explorer.utils';
	import { findEnabledSplToken } from '$sol/utils/spl.utils';

	interface Props {
		transaction: SolTransactionUi;
		token: OptionToken;
	}

	const { transaction, token }: Props = $props();

	let activeTab = $state('summary');

	let {
		from: fromAddress,
		fromOwner,
		value,
		timestamp,
		signature: id,
		blockNumber,
		to: toAddress,
		toOwner,
		type,
		status,
		fee,
		summary,
		netChanges,
		instructions
	} = $derived(transaction);

	const splToken = (tokenAddress: string) =>
		nonNullish(token)
			? findEnabledSplToken({
					tokens: $enabledSplTokens,
					tokenAddress,
					networkId: token.network.id
				})
			: undefined;

	const symbolOf = (tokenAddress: string | undefined): string =>
		isNullish(tokenAddress)
			? SOLANA_TOKEN.symbol
			: (splToken(tokenAddress)?.symbol ?? $i18n.transaction.text.unknown_token);

	const decimalsOf = (change: SolNetBalanceChange): number =>
		change.decimals ??
		(isNullish(change.tokenAddress)
			? SOLANA_TOKEN.decimals
			: (splToken(change.tokenAddress)?.decimals ?? 0));

	// The hero speaks in the summary's terms: the word is the kind, the figure is the main change
	// in its own token, and a swap shows the pair. Records without a summary keep the old rendering.
	let kindLabel = $derived(
		isNullish(summary)
			? undefined
			: summary.kind === 'send'
				? $i18n.send.text.send
				: summary.kind === 'receive'
					? $i18n.receive.text.receive
					: summary.kind === 'swap'
						? $i18n.swap.text.swap
						: $i18n.transaction.text.kind_other
	);

	const heroAmount = (change: SolNetBalanceChange): string =>
		`${formatToken({
			value: absBigInt(change.delta),
			unitName: decimalsOf(change),
			displayDecimals: decimalsOf(change)
		})} ${symbolOf(change.tokenAddress)}`;

	// The rent the transaction paid to open token accounts, stated apart like the send form does:
	// it is not part of the fee, and folded into a delta it reads as value lost to the transfer.
	let ataFee = $derived(
		(instructions ?? []).reduce(
			(acc, { kind, rent }) =>
				kind === 'createTokenAccount' && nonNullish(rent) ? acc + rent : acc,
			ZERO
		)
	);

	// The venue of a routed swap: the program its legs ran through.
	let routeProgram = $derived(
		summary?.kind === 'swap'
			? instructions?.find(({ kind }) => kind === 'route')?.program
			: undefined
	);

	let from = $derived<SolTransactionUi['from'] | SolTransactionUi['fromOwner'] | undefined>(
		fromOwner ?? fromAddress
	);
	let to = $derived<SolTransactionUi['to'] | SolTransactionUi['toOwner'] | undefined>(
		toOwner ?? toAddress
	);

	let explorerUrl: string | undefined = $derived(
		isNetworkSolana(token?.network) ? token.network.explorerUrl : undefined
	);

	let txExplorerUrl: string | undefined = $derived(
		nonNullish(explorerUrl) ? replacePlaceholders(explorerUrl, { $args: `tx/${id}/` }) : undefined
	);

	let toExplorerUrl: string | undefined = $derived(
		nonNullish(explorerUrl)
			? replacePlaceholders(explorerUrl, { $args: `account/${to}/` })
			: undefined
	);

	let fromExplorerUrl: string | undefined = $derived(
		nonNullish(explorerUrl)
			? replacePlaceholders(explorerUrl, { $args: `account/${from}/` })
			: undefined
	);

	let toAtaExplorerUrl: string | undefined = $derived(
		nonNullish(explorerUrl)
			? replacePlaceholders(explorerUrl, { $args: `account/${toAddress}/` })
			: undefined
	);

	let fromAtaExplorerUrl: string | undefined = $derived(
		nonNullish(explorerUrl)
			? replacePlaceholders(explorerUrl, { $args: `account/${fromAddress}/` })
			: undefined
	);

	const onSaveAddressComplete = (data: OpenTransactionParams<AnyTransactionUi>) => {
		modalStore.openSolTransaction({
			id: Symbol(),
			data: data as OpenTransactionParams<SolTransactionUi>
		});
	};
</script>

<Modal onClose={modalStore.close}>
	{#snippet title()}{$i18n.transaction.text.details}{/snippet}

	<ContentWithToolbar>
		<ModalHero variant={(summary?.kind ?? type) === 'receive' ? 'success' : 'default'}>
			{#snippet logo()}
				{#if nonNullish(token)}
					<TokenLogo badge={{ type: 'network' }} data={token} logoSize="lg" />
				{/if}
			{/snippet}
			{#snippet subtitle()}
				{#if nonNullish(kindLabel)}
					<span>{kindLabel}</span>
				{:else}
					<span class="capitalize">{type}</span>
				{/if}
			{/snippet}
			{#snippet title()}
				{#if summary?.kind === 'swap' && nonNullish(summary.spent) && nonNullish(summary.received)}
					<output>{`${heroAmount(summary.spent)} → ${heroAmount(summary.received)}`}</output>
				{:else if nonNullish(summary) && nonNullish(summary.spent ?? summary.received)}
					{@const change = summary.spent ?? summary.received}
					{#if nonNullish(change)}
						<output class:text-success-primary={summary.kind === 'receive'}>
							{`${summary.kind === 'receive' ? '+' : ''}${heroAmount(change)}`}
						</output>
					{/if}
				{:else if nonNullish(token) && nonNullish(value) && isNullish(summary)}
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

		<Tabs
			styleClass="mt-4"
			tabs={[
				{ label: $i18n.transaction.text.tab_summary, id: 'summary' },
				{ label: $i18n.transaction.text.tab_balance_changes, id: 'changes' },
				{ label: $i18n.transaction.text.tab_instructions, id: 'instructions' }
			]}
			bind:activeTab
		>
			{#if activeTab === 'summary'}
				<!-- The card names a counterparty, which only a send or a receive has: a swap's other
				     side is a program, and offering to save your own wallet as a contact says nothing. -->
				{#if nonNullish(toAddress) && nonNullish(fromAddress) && (isNullish(summary) || ['send', 'receive'].includes(summary.kind))}
					<TransactionContactCard
						{from}
						{fromExplorerUrl}
						{onSaveAddressComplete}
						{to}
						{toExplorerUrl}
						type={type === 'receive' ? 'receive' : 'send'}
					/>
				{/if}

				<List styleClass="mt-5">
					{#if nonNullish(token?.network)}
						<ListItem>
							<span>
								{$i18n.networks.network}
							</span>

							<NetworkWithLogo network={token.network} />
						</ListItem>
					{/if}

					{#if nonNullish(routeProgram)}
						<ListItem>
							<span>{$i18n.transaction.text.interacted_with}</span>
							<output class="flex max-w-[50%] flex-row">
								<output>{shortenWithMiddleEllipsis({ text: routeProgram })}</output>
								<AddressActions
									copyAddress={routeProgram}
									copyAddressText={$i18n.wallet.text.address_copied}
									externalLink={solAccountExplorerUrl({
										network: token?.network,
										address: routeProgram
									})}
									externalLinkAriaLabel={$i18n.wallet_connect.alt.open_address_block_explorer}
								/>
							</output>
						</ListItem>
					{/if}

					{#if type === 'receive' && nonNullish(from) && nonNullish(fromAddress) && from !== fromAddress}
						<ListItem>
							<span>{$i18n.transaction.text.from_ata}</span>
							<output class="flex max-w-[50%] flex-row">
								<output>{shortenWithMiddleEllipsis({ text: fromAddress })}</output>

								<AddressActions
									copyAddress={fromAddress}
									copyAddressText={$i18n.transaction.text.from_ata_copied}
									externalLink={fromAtaExplorerUrl}
									externalLinkAriaLabel={$i18n.transaction.alt.open_to_block_explorer}
								/>
							</output>
						</ListItem>
					{/if}
					{#if type === 'send' && nonNullish(to) && nonNullish(toAddress) && to !== toAddress}
						<ListItem>
							<span>{$i18n.transaction.text.to_ata}</span>
							<output class="flex max-w-[50%] flex-row">
								<output>{shortenWithMiddleEllipsis({ text: toAddress })}</output>
								<AddressActions
									copyAddress={toAddress}
									copyAddressText={$i18n.transaction.text.to_ata_copied}
									externalLink={toAtaExplorerUrl}
									externalLinkAriaLabel={$i18n.transaction.alt.open_from_block_explorer}
								/>
							</output>
						</ListItem>
					{/if}

					{#if nonNullish(id)}
						<ListItem>
							<span>
								{$i18n.transaction.text.signature}
							</span>

							<span>
								<output>{shortenWithMiddleEllipsis({ text: id })}</output>
								<AddressActions
									copyAddress={id}
									copyAddressText={replacePlaceholders($i18n.transaction.text.signature_copied, {
										$signature: id
									})}
									externalLink={txExplorerUrl}
									externalLinkAriaLabel={$i18n.transaction.alt.open_block_explorer}
								/>
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

					{#if nonNullish(status)}
						<ListItem>
							<span>
								{$i18n.transaction.text.status}
							</span>
							<span>
								{`${$i18n.transaction.status[status]}`}
							</span>
						</ListItem>
					{/if}

					{#if nonNullish(timestamp)}
						<ListItem>
							<span>
								{$i18n.transaction.text.timestamp}
							</span>

							<output
								>{formatSecondsToDate({
									seconds: Number(timestamp),
									language: $currentLanguage
								})}</output
							>
						</ListItem>
					{/if}
				</List>

				<!-- What the transaction cost, after what it did: the base and priority fee the network
				     charged as one figure, since an executed transaction reports only their sum, and the
				     rent of any account it opened stated apart, as the send form does. -->
				{#if (nonNullish(fee) && fee > ZERO) || ataFee > ZERO}
					<List styleClass="mt-5">
						{#if nonNullish(fee) && fee > ZERO}
							<ListItem>
								<span>{$i18n.fee.text.fee}</span>
								<output data-tid="transaction-fee">
									{`${formatToken({ value: fee, unitName: SOLANA_TOKEN.decimals, displayDecimals: SOLANA_TOKEN.decimals })} ${SOLANA_TOKEN.symbol}`}
								</output>
							</ListItem>
						{/if}

						{#if ataFee > ZERO}
							<ListItem>
								<span>{$i18n.fee.text.ata_fee}</span>
								<output data-tid="transaction-ata-fee">
									{`${formatToken({ value: ataFee, unitName: SOLANA_TOKEN.decimals, displayDecimals: SOLANA_TOKEN.decimals })} ${SOLANA_TOKEN.symbol}`}
								</output>
							</ListItem>
						{/if}
					</List>
				{/if}
			{:else if activeTab === 'changes'}
				{#if nonNullish(netChanges)}
					<div class="flex flex-col gap-1" data-tid="sol-balance-changes">
						{#each netChanges as change, i (i)}
							<span class:text-success-primary={change.delta > ZERO}>
								{`${change.delta > ZERO ? '+' : '-'}${formatToken({
									value: change.delta > ZERO ? change.delta : -change.delta,
									unitName: decimalsOf(change),
									displayDecimals: decimalsOf(change)
								})} ${symbolOf(change.tokenAddress)}`}
							</span>
						{:else}
							<span class="text-tertiary">{$i18n.transaction.text.no_balance_changes}</span>
						{/each}

						{#if ataFee > ZERO}
							<span class="text-tertiary">
								{`${$i18n.fee.text.ata_fee}: ${formatToken({ value: ataFee, unitName: SOLANA_TOKEN.decimals, displayDecimals: SOLANA_TOKEN.decimals })} ${SOLANA_TOKEN.symbol}`}
							</span>
						{/if}
					</div>
				{:else}
					<span class="text-tertiary">{$i18n.transaction.text.tab_unavailable}</span>
				{/if}
			{:else if nonNullish(token)}
				<SolInstructionsList instructions={instructions ?? []} {netChanges} {token} />
			{/if}
		</Tabs>

		{#snippet toolbar()}
			<ButtonCloseModal />
		{/snippet}
	</ContentWithToolbar>
</Modal>
