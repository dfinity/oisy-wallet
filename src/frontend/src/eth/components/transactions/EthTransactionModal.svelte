<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import EthTransactionStatus from '$eth/components/transactions/EthTransactionStatus.svelte';
	import { ercFungibleTokens } from '$eth/derived/erc-fungible.derived';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import { enabledEthEvmNativeTokens } from '$eth/derived/native-tokens.derived';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import { isTokenErc721 } from '$eth/utils/erc721.utils';
	import { getExplorerUrl } from '$eth/utils/eth.utils';
	import {
		decodeErc20AbiDataValue,
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
		data,
		gasUsed,
		gasPrice
	} = $derived(transaction);

	let isSend = $derived(type === 'send');
	let isDeposit = $derived(type === 'deposit');
	let isApprove = $derived(type === 'approve');

	let isOutFlow = $derived(isSend || isDeposit || isApprove);

	let approveToken = $derived(
		isApprove && nonNullish(to) && nonNullish(token)
			? $ercFungibleTokens.find(
					({ address, network: { id: networkId } }) =>
						areAddressesEqual({ address1: address, address2: to, networkId }) &&
						networkId === token.network.id
				)
			: undefined
	);

	let approveValue = $derived(
		isApprove && nonNullish(data) ? decodeErc20AbiDataValue({ data }) : undefined
	);

	let isUnlimitedApprove = $derived(isMaxUint256(approveValue));

	let displayToken = $derived(approveToken ?? token);

	let explorerBaseUrl = $derived(getExplorerUrl({ token }));

	let explorerUrl: string | undefined = $derived(
		notEmptyString(hash) ? `${explorerBaseUrl}/tx/${hash}` : undefined
	);

	let fromExplorerUrl: string = $derived(`${explorerBaseUrl}/address/${from}`);

	let toExplorerUrl: string | undefined = $derived(
		notEmptyString(to) ? `${explorerBaseUrl}/address/${to}` : undefined
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
				<span class="capitalize">{$i18n.transaction.type[type]}</span>
			{/snippet}

			{#snippet title()}
				{#if isApprove && nonNullish(displayToken)}
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
						{/if}
					</output>
				{:else if nonNullish(token) && !isTokenErc721(token) && nonNullish(value)}
					<output class:text-success-primary={type === 'receive'}>
						{formatToken({
							value,
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
		{:else if nonNullish(to) && nonNullish(from)}
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

			{#if nonNullish(to) && nonNullish(toDisplay) && to !== toDisplay}
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
