<script lang="ts">
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import EthTransactionStatus from '$eth/components/transactions/EthTransactionStatus.svelte';
	import { ercFungibleTokens } from '$eth/derived/erc-fungible.derived';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import { ercTransfersByNetworkAndHash } from '$eth/derived/eth-transactions.derived';
	import { enabledEthEvmNativeTokens } from '$eth/derived/native-tokens.derived';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import { isTokenErc } from '$eth/utils/erc.utils';
	import { isTokenErc721 } from '$eth/utils/erc721.utils';
	import { getExplorerUrl } from '$eth/utils/eth.utils';
	import { isTokenEthereumNative } from '$eth/utils/native-token.utils';
	import {
		tryDecodeErc20AbiData,
		findErcTransfers,
		formatErcTransferAsset,
		isErc20TransactionDeposit,
		isErc20TransactionTransfer,
		isMaxUint256,
		mapAddressToName
	} from '$eth/utils/transactions.utils';
	import { ckMinterBuiltInContacts } from '$icp-eth/derived/ck-minter-contacts.derived';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TransactionContactCard from '$lib/components/transactions/TransactionContactCard.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore, type OpenTransactionParams } from '$lib/stores/modal.store';
	import { nftStore } from '$lib/stores/nft.store';
	import type { OptionString } from '$lib/types/string';
	import type { OptionToken } from '$lib/types/token';
	import type { AnyTransactionUi } from '$lib/types/transaction-ui';
	import { areAddressesEqual } from '$lib/utils/address.utils';
	import {
		formatSecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isTokenNonFungible } from '$lib/utils/nft.utils';
	import { findNft } from '$lib/utils/nfts.utils';
	import { parseNftId } from '$lib/validation/nft.validation';

	interface Props {
		transaction: EthTransactionUi;
		token: OptionToken;
	}

	const { transaction, token }: Props = $props();

	let {
		from,
		value,
		timestamp,
		hash,
		blockNumber,
		to,
		type,
		approveSpender,
		transferRecipient,
		data,
		gasUsed,
		gasPrice
	} = $derived(transaction);

	let isSend = $derived(type === 'send');
	let isDeposit = $derived(type === 'deposit');
	let isApprove = $derived(type === 'approve');

	let isOutFlow = $derived(isSend || isDeposit || isApprove);

	let isErc20Deposit = $derived(isErc20TransactionDeposit(data));

	let isErc20Transfer = $derived(isSend && isErc20TransactionTransfer(data));

	let { to: dataTo, value: dataValue } = $derived(
		(isApprove || isErc20Deposit || isErc20Transfer) && nonNullish(data)
			? tryDecodeErc20AbiData({ data })
			: { to: undefined, value: undefined }
	);

	let depositToken = $derived(
		isErc20Deposit && nonNullish(dataTo) && nonNullish(token)
			? $ercFungibleTokens.find(
					({ address, network: { id: networkId } }) =>
						areAddressesEqual({ address1: address, address2: dataTo, networkId }) &&
						networkId === token.network.id
				)
			: undefined
	);

	let depositValue = $derived(isErc20Deposit ? dataValue : undefined);

	// Both `approve` and ERC20 `transfer` transactions are addressed to the ERC20 contract, so the
	// transaction `to` identifies the token the transaction is about - not the spender or the recipient.
	let contractToken = $derived(
		(isApprove || isErc20Transfer) && nonNullish(to) && nonNullish(token)
			? $ercFungibleTokens.find(
					({ address, network: { id: networkId } }) =>
						areAddressesEqual({ address1: address, address2: to, networkId }) &&
						networkId === token.network.id
				)
			: undefined
	);

	let approveToken = $derived(isApprove ? contractToken : undefined);

	let approveValue = $derived(isApprove ? dataValue : undefined);

	let isUnlimitedApprove = $derived(isMaxUint256(approveValue));

	// A zero-value native send is the fee entry of a token transfer: the transfer itself moved no
	// native value. Its loaded counterparts are the `Transfer` events, so they describe a direct
	// transfer, a router send and a `transferFrom` alike - unlike the calldata, which covers the first.
	let ercTransfers = $derived(
		isSend && value === ZERO && nonNullish(token) && isTokenEthereumNative(token)
			? findErcTransfers({
					hash,
					networkId: token.network.id,
					transfers: $ercTransfersByNetworkAndHash
				})
			: []
	);

	let ercTransfer = $derived(ercTransfers.length === 1 ? ercTransfers[0] : undefined);

	let isCombinedFee = $derived(ercTransfers.length > 1);

	// Calldata carrying the transfer selector still may not decode. Without a recipient and an amount
	// there is nothing for the calldata to contribute, so only a loaded transfer can resolve it.
	let transferDecoded = $derived(isErc20Transfer && nonNullish(dataTo) && nonNullish(dataValue));

	// Falls back to the calldata when the transferred token is not loaded, so that the hero does not
	// change once an unrelated token list finishes loading.
	let transferToken = $derived(ercTransfer?.token ?? (transferDecoded ? contractToken : undefined));

	let transferValue = $derived(
		nonNullish(ercTransfer)
			? ercTransfer.transaction.value
			: nonNullish(transferToken)
				? dataValue
				: undefined
	);

	let transferAssetText = $derived(
		nonNullish(transferToken)
			? formatErcTransferAsset({
					token: transferToken,
					value: transferValue,
					tokenId: ercTransfer?.transaction.tokenId
				})
			: undefined
	);

	// Several transfers under one hash - a swap, a batch send - and the entry describes none of them.
	// All it accounts for is the fee that paid for them, so that is what it reads as. The calldata
	// still wins when it names the asset, as for a single transfer split into several.
	let showAsFee = $derived(isCombinedFee && isNullish(transferAssetText));

	// The transaction is addressed to the token contract, so showing `to` as the counterparty of a
	// send would present the contract as the recipient. The recipient comes from the loaded transfer,
	// or from the calldata.
	//
	// Deliberately not gated on `transferToken`: recognising the contract is what lets us name the
	// asset and show the fee, not what makes the decoded address the recipient. Requiring it would
	// put the contract back in the counterparty of every transfer of a token we do not know.
	let recipient = $derived(ercTransfer?.transaction.to ?? transferRecipient ?? to);

	// The fee is known from the receipt whether or not the token is: naming the asset needs the
	// contract, accounting for what left the native balance does not. Either source establishes the
	// entry as the fee side of a transfer - the loaded one also covers a router send, which no
	// calldata decode can. A transfer that also moved native value is a real native send.
	let isTransferFeeEntry = $derived((nonNullish(ercTransfer) || transferDecoded) && value === ZERO);

	// The contract of the transferred token, so it can be verified: a symbol is not unique. On the
	// native entry it is the transaction `to`; opened from the token itself it is that token, since
	// there `to` is the recipient.
	let contractAddress = $derived(
		(isErc20Transfer ? to : undefined) ??
			(nonNullish(token) && isTokenErc(token) ? token.address : undefined)
	);

	let displayToken = $derived(depositToken ?? approveToken ?? transferToken ?? token);

	let explorerBaseUrl = $derived(getExplorerUrl({ token }));

	let explorerUrl: string | undefined = $derived(
		notEmptyString(hash) ? `${explorerBaseUrl}/tx/${hash}` : undefined
	);

	let fromExplorerUrl: string = $derived(`${explorerBaseUrl}/address/${from}`);

	let toExplorerUrl: string | undefined = $derived(
		notEmptyString(to) ? `${explorerBaseUrl}/address/${to}` : undefined
	);

	let recipientExplorerUrl: string | undefined = $derived(
		notEmptyString(recipient) ? `${explorerBaseUrl}/address/${recipient}` : undefined
	);

	let contractExplorerUrl: string | undefined = $derived(
		notEmptyString(contractAddress) ? `${explorerBaseUrl}/address/${contractAddress}` : undefined
	);

	let approveSpenderExplorerUrl = $derived(
		nonNullish(approveSpender) ? `${explorerBaseUrl}/address/${approveSpender}` : undefined
	);

	let fromDisplay: OptionString = $derived(
		nonNullish(token)
			? (mapAddressToName({
					address: from,
					networkId: token.network.id,
					erc20Tokens: $erc20Tokens,
					builtInContacts: $ckMinterBuiltInContacts
				}) ?? from)
			: from
	);

	const toDisplay: OptionString = $derived(
		nonNullish(token)
			? (mapAddressToName({
					address: to,
					networkId: token.network.id,
					erc20Tokens: $erc20Tokens,
					builtInContacts: $ckMinterBuiltInContacts
				}) ?? to)
			: to
	);

	let spenderDisplay = $derived(
		isApprove && nonNullish(approveSpender) && nonNullish(token)
			? (mapAddressToName({
					address: approveSpender,
					networkId: token.network.id,
					erc20Tokens: $erc20Tokens,
					builtInContacts: $ckMinterBuiltInContacts
				}) ?? undefined)
			: undefined
	);

	let gasFee = $derived(
		nonNullish(gasUsed) && nonNullish(gasPrice) ? gasUsed * gasPrice : undefined
	);

	let fee = $derived(isOutFlow ? gasFee : undefined);

	let nativeToken = $derived(
		$enabledEthEvmNativeTokens.find(
			({ network: { id: networkId } }) => networkId === token?.network.id
		)
	);

	const onSaveAddressComplete = (data: OpenTransactionParams<AnyTransactionUi>) => {
		modalStore.openEthTransaction({
			id: Symbol(),
			data: data as OpenTransactionParams<EthTransactionUi>
		});
	};

	const nft = $derived(
		nonNullish($nftStore) &&
			nonNullish(token) &&
			isTokenNonFungible(token) &&
			nonNullish(transaction.tokenId)
			? findNft({ nfts: $nftStore, token, tokenId: parseNftId(String(transaction.tokenId)) })
			: undefined
	);

	let displayValue = $derived(
		(isErc20Deposit || isTransferFeeEntry || showAsFee) && nonNullish(gasFee) ? gasFee : value
	);

	let displayType = $derived(isErc20Deposit ? 'deposit' : type);
</script>

<Modal onClose={modalStore.close}>
	{#snippet title()}{$i18n.transaction.text.details}{/snippet}

	<ContentWithToolbar>
		<ModalHero variant={type === 'receive' ? 'success' : 'default'}>
			{#snippet logo()}
				{#if nonNullish(displayToken)}
					{#if nonNullish(token) && isTokenNonFungible(token) && nonNullish(nft)}
						<NftCard {nft} />
					{:else}
						<TokenLogo badge={{ type: 'network' }} data={displayToken} logoSize="lg" />
					{/if}
				{/if}
			{/snippet}

			{#snippet subtitle()}
				<span class="capitalize"
					>{showAsFee ? $i18n.fee.text.fee : $i18n.transaction.type[displayType]}</span
				>
			{/snippet}

			{#snippet title()}
				{#if (isApprove || isErc20Deposit || nonNullish(transferToken)) && nonNullish(displayToken)}
					<output>
						{#if isUnlimitedApprove}
							{replacePlaceholders($i18n.core.text.unlimited, {
								$items: displayToken.symbol
							})}
						{:else if nonNullish(approveValue)}
							{formatToken({
								value: approveValue,
								unitName: displayToken.decimals,
								displayDecimals: displayToken.decimals
							})}
							{displayToken.symbol}
						{:else if nonNullish(depositValue)}
							{formatToken({
								value: depositValue,
								unitName: displayToken.decimals,
								displayDecimals: displayToken.decimals
							})}
							{displayToken.symbol}
						{:else if nonNullish(transferAssetText)}
							{transferAssetText}
						{/if}
					</output>
				{:else if isTransferFeeEntry}
					<output>{$i18n.transaction.text.unknown_token}</output>
				{:else if nonNullish(token) && !isTokenErc721(token) && nonNullish(value)}
					<output class:text-success-primary={type === 'receive'}>
						{formatToken({
							value: displayValue,
							unitName: token.decimals,
							displayDecimals: token.decimals,
							showPlusSign: type === 'receive'
						})}
						{token.symbol}
					</output>
				{/if}
			{/snippet}
		</ModalHero>

		{#if isApprove && nonNullish(approveSpender)}
			<TransactionContactCard
				{approveSpender}
				{approveSpenderExplorerUrl}
				{from}
				{fromExplorerUrl}
				{onSaveAddressComplete}
				type="approve"
			/>
		{:else if nonNullish(recipient) && nonNullish(from)}
			<TransactionContactCard
				{from}
				{fromExplorerUrl}
				{onSaveAddressComplete}
				to={recipient}
				toExplorerUrl={recipientExplorerUrl}
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

			{#if nonNullish(hash)}
				<ListItem>
					<span>{$i18n.transaction.text.hash}</span>
					<span>
						<output>{shortenWithMiddleEllipsis({ text: hash })}</output>

						<AddressActions
							copyAddress={hash}
							copyAddressText={replacePlaceholders($i18n.transaction.text.hash_copied, {
								$hash: hash
							})}
							externalLink={explorerUrl}
							externalLinkAriaLabel={$i18n.transaction.alt.open_block_explorer}
						/>
					</span>
				</ListItem>
			{/if}

			{#if nonNullish(blockNumber) && nonNullish(token)}
				<ListItem>
					<span>{$i18n.transaction.text.block}</span>
					<span>
						<output>{blockNumber}</output>
					</span>
				</ListItem>

				<ListItem>
					<EthTransactionStatus {blockNumber} {token} />
				</ListItem>
			{/if}

			{#if nonNullish(timestamp)}
				<ListItem>
					<span>{$i18n.transaction.text.timestamp}</span>
					<output
						>{formatSecondsToDate({
							seconds: Number(timestamp),
							language: $currentLanguage
						})}</output
					>
				</ListItem>
			{/if}

			{#if nonNullish(from) && nonNullish(fromDisplay) && from !== fromDisplay}
				<ListItem>
					<span>{$i18n.transaction.text.from}</span>
					<span class="flex max-w-[50%] flex-row break-all">
						<output>{fromDisplay}</output>

						<AddressActions
							copyAddress={fromDisplay}
							copyAddressText={$i18n.transaction.text.from_copied}
							externalLink={fromExplorerUrl}
							externalLinkAriaLabel={$i18n.transaction.alt.open_from_block_explorer}
						/>
					</span>
				</ListItem>
			{/if}

			<!-- The address alone: a name does not identify a token, verifying the contract is the point
			of the row, and the hero already names the asset. Both together overflow the row. -->
			{#if nonNullish(contractAddress)}
				<ListItem>
					<span>{$i18n.transaction.text.interacted_with}</span>

					<span class="flex max-w-[50%] flex-row break-all">
						<output>{shortenWithMiddleEllipsis({ text: contractAddress })}</output>

						<AddressActions
							copyAddress={contractAddress}
							copyAddressText={$i18n.transaction.text.to_copied}
							externalLink={contractExplorerUrl}
							externalLinkAriaLabel={$i18n.transaction.alt.open_to_block_explorer}
						/>
					</span>
				</ListItem>
			{:else if nonNullish(to) && nonNullish(toDisplay) && to !== toDisplay}
				<ListItem>
					<span>{$i18n.transaction.text.interacted_with}</span>

					<span class="flex max-w-[50%] flex-row break-all">
						<output>{toDisplay}</output>

						<AddressActions
							copyAddress={toDisplay}
							copyAddressText={$i18n.transaction.text.to_copied}
							externalLink={toExplorerUrl}
							externalLinkAriaLabel={$i18n.transaction.alt.open_to_block_explorer}
						/>
					</span>
				</ListItem>
			{/if}

			<!-- Only for a token we cannot name: unscaled by decimals it is not an amount, and stating
			it next to a known symbol would misread by orders of magnitude. -->
			{#if isTransferFeeEntry && isNullish(transferToken) && nonNullish(dataValue)}
				<ListItem>
					<span>{$i18n.transaction.text.raw_value}</span>

					<output>{dataValue}</output>
				</ListItem>
			{/if}

			{#if nonNullish(fee) && nonNullish(nativeToken)}
				<ListItem>
					<span>{$i18n.fee.text.fee}</span>

					<output>
						{formatToken({
							value: fee,
							unitName: nativeToken.decimals,
							displayDecimals: nativeToken.decimals
						})}
						{nativeToken.symbol}
					</output>
				</ListItem>
			{/if}

			{#if isApprove && nonNullish(approveSpender)}
				<ListItem>
					<span>{$i18n.wallet_connect.text.spender}</span>

					<span class="flex max-w-[50%] flex-row break-all">
						<output>{spenderDisplay ?? shortenWithMiddleEllipsis({ text: approveSpender })}</output>

						<AddressActions
							copyAddress={approveSpender}
							copyAddressText={$i18n.transaction.text.for_copied}
							externalLink={approveSpenderExplorerUrl}
							externalLinkAriaLabel={$i18n.transaction.alt.open_for_block_explorer}
						/>
					</span>
				</ListItem>
			{/if}

			{#if nonNullish(token) && isTokenNonFungible(token) && nonNullish(transaction.tokenId)}
				<ListItem>
					<span>{$i18n.core.text.tokenId}</span>
					<output>
						{transaction.tokenId}
					</output>
				</ListItem>
			{/if}
		</List>

		{#snippet toolbar()}
			<ButtonCloseModal />
		{/snippet}
	</ContentWithToolbar>
</Modal>
