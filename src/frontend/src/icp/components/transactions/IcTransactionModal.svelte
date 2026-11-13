<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import IcTransactionLabel from '$icp/components/transactions/IcTransactionLabel.svelte';
	import { cmcDepositAccountCanisterIds } from '$icp/derived/cycles-top-up.derived';
	import { isIcrcTokenSupportIcrc3 } from '$icp/services/icrc.services';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import { isTokenCyclesLedger } from '$icp/utils/cycles-mint.utils';
	import { getTopUpCanisterId } from '$icp/utils/cycles-top-up.utils';
	import { icrcAccountExplorerUrl, icrcTxExplorerUrl } from '$icp/utils/icrc-transactions.utils';
	import { isTokenIcp, isTokenIcrc } from '$icp/utils/icrc.utils';
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
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore, type OpenTransactionParams } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import type { AnyTransactionUi } from '$lib/types/transaction-ui';
	import {
		formatNanosecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		transaction: IcTransactionUi;
		token: OptionToken;
	}

	const { transaction, token }: Props = $props();

	let {
		id,
		from,
		to,
		value,
		timestamp,
		type,
		txExplorerUrl,
		fromExplorerUrl,
		toExplorerUrl,
		fee,
		incoming,
		approveSpender,
		approveSpenderExplorerUrl,
		approveExpiresAt,
		typeLabel,
		twinTransaction
	} = $derived(transaction);

	let twinNetworkName = $derived((token as OptionIcCkToken)?.twinToken?.network.name);

	// ICP's mapper links the spender's account identifier. An ICRC spender is an ICRC-1 account,
	// which only the ledger's own account page on the dashboard can show.
	let spenderExplorerUrl = $derived(
		approveSpenderExplorerUrl ??
			(nonNullish(approveSpender) && nonNullish(token) && isTokenIcrc(token)
				? icrcAccountExplorerUrl({
						ledgerCanisterId: token.ledgerCanisterId,
						account: approveSpender
					})
				: undefined)
	);

	// Only the mappers of ICP and the ck tokens link the ID. Any other ICRC ledger gets the
	// dashboard link once it confirms it serves ICRC-3 blocks: without them the page is empty.
	let unlinkedIcrcLedgerCanisterId = $derived(
		isNullish(txExplorerUrl) && nonNullish(token) && isTokenIcrc(token)
			? token.ledgerCanisterId
			: undefined
	);

	let icrc3LedgerCanisterId = $state<string | undefined>();

	$effect(() => {
		const ledgerCanisterId = unlinkedIcrcLedgerCanisterId;

		if (isNullish(ledgerCanisterId)) {
			return;
		}

		isIcrcTokenSupportIcrc3({ identity: $authIdentity, ledgerCanisterId })
			.then((supported) => {
				if (supported) {
					icrc3LedgerCanisterId = ledgerCanisterId;
				}
			})
			.catch(() => {
				// Without an answer the ID keeps its copy button only.
			});
	});

	let idExplorerUrl = $derived(
		txExplorerUrl ??
			(nonNullish(unlinkedIcrcLedgerCanisterId) &&
			icrc3LedgerCanisterId === unlinkedIcrcLedgerCanisterId
				? icrcTxExplorerUrl({
						ledgerCanisterId: unlinkedIcrcLedgerCanisterId,
						// The receive half of a transfer to self carries a suffix the ledger does not know.
						blockIndex: id.replace('-self', '')
					})
				: undefined)
	);

	let isIncoming = $derived(type === 'receive' || type === 'mint');

	// A top-up, and a TCYCLES top-up's refund, read as such here too, as they do in the list.
	// On ICP only a canister top-up has a label.
	let showTypeLabel = $derived(
		nonNullish(typeLabel) && nonNullish(token) && (isTokenCyclesLedger(token) || isTokenIcp(token))
	);

	// As in the list: a top-up shows the canister that got the cycles. The CMC deposit account an
	// ICP top-up pays into is never shown, nor its explorer link.
	let topUp = $derived(showTypeLabel && typeLabel === 'transaction.label.top_up');

	let topUpCanisterId = $derived(
		getTopUpCanisterId({
			transaction,
			cmcDepositAccountCanisterIds: $cmcDepositAccountCanisterIds
		})
	);

	const onSaveAddressComplete = (data: OpenTransactionParams<AnyTransactionUi>) => {
		modalStore.openIcTransaction({
			id: Symbol(),
			data: data as OpenTransactionParams<IcTransactionUi>
		});
	};
</script>

<Modal onClose={modalStore.close}>
	{#snippet title()}{$i18n.transaction.text.details}{/snippet}

	<ContentWithToolbar>
		<ModalHero variant={isIncoming ? 'success' : 'default'}>
			{#snippet logo()}
				{#if nonNullish(token)}
					<TokenLogo badge={{ type: 'network' }} data={token} logoSize="lg" />
				{/if}
			{/snippet}
			{#snippet subtitle()}
				{#if showTypeLabel}
					<IcTransactionLabel label={typeLabel} {token} {type} />
				{:else}
					<span class="capitalize">{type}</span>
				{/if}
			{/snippet}
			{#snippet title()}
				{#if nonNullish(token) && nonNullish(value)}
					<output class:text-success-primary={isIncoming}>
						{formatToken({
							value,
							unitName: token.decimals,
							displayDecimals: token.decimals,
							showPlusSign: isIncoming
						})}
						{token.symbol}
					</output>
				{:else}
					&ZeroWidthSpace;
				{/if}
			{/snippet}
		</ModalHero>

		{#if topUp}
			<TransactionContactCard
				{onSaveAddressComplete}
				to={topUpCanisterId}
				toExplorerUrl={topUpCanisterId === to ? toExplorerUrl : undefined}
				type="top_up"
			/>
		{:else if (nonNullish(to) && nonNullish(from)) || (type === 'approve' && nonNullish(from))}
			<TransactionContactCard
				{approveSpender}
				approveSpenderExplorerUrl={spenderExplorerUrl}
				{from}
				{fromExplorerUrl}
				{onSaveAddressComplete}
				{to}
				{toExplorerUrl}
				type={isIncoming ? 'receive' : type === 'approve' ? 'approve' : 'send'}
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

			{#if nonNullish(timestamp)}
				<ListItem>
					<span>{$i18n.transaction.text.timestamp}</span>
					<output
						>{formatNanosecondsToDate({
							nanoseconds: timestamp,
							language: $currentLanguage
						})}</output
					>
				</ListItem>
			{/if}

			<ListItem>
				<span>{$i18n.transaction.text.id}</span>
				<span>
					<output>{id}</output>

					<AddressActions
						copyAddress={`${id}`}
						copyAddressText={$i18n.transaction.text.id_copied}
						externalLink={idExplorerUrl}
						externalLinkAriaLabel={$i18n.transaction.alt.open_block_explorer}
					/>
				</span>
			</ListItem>

			{#if type === 'burn' && isNullish(to) && nonNullish(transaction.toLabel) && nonNullish(twinNetworkName)}
				<ListItem>
					<span>{$i18n.transaction.text.to}</span>
					<span><IcTransactionLabel label={transaction.toLabel} {token} /></span>
				</ListItem>
			{/if}

			{#if nonNullish(twinTransaction) && nonNullish(twinNetworkName)}
				<ListItem>
					<span>
						{replacePlaceholders($i18n.transaction.text.twin_transaction, {
							$twinNetwork: twinNetworkName
						})}
					</span>
					<span>
						<output>{shortenWithMiddleEllipsis({ text: twinTransaction.id })}</output>

						<AddressActions
							copyAddress={twinTransaction.id}
							copyAddressText={$i18n.transaction.text.id_copied}
							externalLink={twinTransaction.explorerUrl}
							externalLinkAriaLabel={$i18n.transaction.alt.open_block_explorer}
						/>
					</span>
				</ListItem>
			{/if}

			{#if nonNullish(fee) && nonNullish(token) && !incoming}
				<ListItem>
					<span>{$i18n.fee.text.fee}</span>

					<output>
						{formatToken({
							value: fee,
							unitName: token.decimals,
							displayDecimals: token.decimals
						})}
						{token.symbol}
					</output>
				</ListItem>
			{/if}

			{#if nonNullish(approveExpiresAt)}
				<ListItem>
					<span>{$i18n.transaction?.text?.expiration}</span>
					<output>
						{formatNanosecondsToDate({
							nanoseconds: approveExpiresAt,
							language: $currentLanguage
						})}
					</output>
				</ListItem>
			{/if}
		</List>

		{#snippet toolbar()}
			<ButtonCloseModal />
		{/snippet}
	</ContentWithToolbar>
</Modal>
