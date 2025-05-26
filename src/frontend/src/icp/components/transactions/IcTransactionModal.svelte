<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import IcTransactionLabel from '$icp/components/transactions/IcTransactionLabel.svelte';
	import type { IcTransactionType, IcTransactionUi } from '$icp/types/ic-transaction';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import SettingsList from '$lib/components/settings/SettingsList.svelte';
	import SettingsListItem from '$lib/components/settings/SettingsListItem.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TransactionContactCard from '$lib/components/transactions/TransactionContactCard.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { contacts } from '$lib/derived/contacts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionToken } from '$lib/types/token';
	import { getContactForAddress } from '$lib/utils/contact.utils';
	import {
		formatNanosecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';

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

			{#if nonNullish(timestamp)}
				<li class="border-b-1 flex flex-row justify-between border-brand-subtle-10 py-1.5">
					<span>{$i18n.transaction.text.timestamp}</span>
					<output>{formatNanosecondsToDate(timestamp)}</output>
				</li>
			{/if}

			{#if nonNullish(token)}
				<li class="border-b-1 flex flex-row justify-between border-brand-subtle-10 py-1.5">
					<span>{$i18n.networks.network}</span>
					<span><NetworkWithLogo network={token.network} logo="start" /></span>
				</li>
			{/if}

			<li class="border-b-1 flex flex-row justify-between border-brand-subtle-10 py-1.5">
				<span>{$i18n.transaction.text.id}</span>
				<span>
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
				</span>
			</li>
		</ul>

		<!--
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
-->
		<ButtonCloseModal slot="toolbar" />
	</ContentWithToolbar>
</Modal>
