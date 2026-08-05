<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import Button from '$lib/components/ui/Button.svelte';
	import ConfirmButtonWithModal from '$lib/components/ui/ConfirmButtonWithModal.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import {
		PLUG_IMPORT_ACCOUNT,
		PLUG_IMPORT_SEND_BUTTON,
		PLUG_IMPORT_SEND_DISABLED
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	import type { PlugBalance, PlugAccount } from '$lib/types/plug';
	import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkIdEthereum, isNetworkIdEvm } from '$lib/utils/network.utils';
	import {
		isPlugEvmContractToken,
		isPlugEvmSendable,
		isPlugSweepableToken,
		plugRowKey,
		plugSweepableAmount
	} from '$lib/utils/plug.utils';

	interface Props {
		account: PlugAccount;
		balances: PlugBalance[] | undefined;
		sending?: string | undefined;
		onsend: (params: { balance: PlugBalance; amount: bigint }) => void;
	}

	let { account, balances, sending, onsend }: Props = $props();

	const isEvm = ({ token: { network } }: PlugBalance): boolean =>
		isNetworkIdEthereum(network.id) || isNetworkIdEvm(network.id);

	// How much a row can move, or undefined when it cannot move at all. EVM amounts
	// are settled at send time against live fee data — gas is not knowable here — so
	// the row reports the full balance and the service trims the reserve.
	const sendableAmount = (row: PlugBalance): bigint | undefined => {
		const { token, balance } = row;

		if (isEvm(row)) {
			return isPlugEvmSendable({ token, balance, balances: balances ?? [] }) ? balance : undefined;
		}

		return plugSweepableAmount({ token, balance });
	};

	// Why a row cannot be moved, or undefined when it can. A reason rather than a
	// boolean, so a blocked row can say what is wrong instead of only greying out:
	// an unsupported chain, a missing gas balance and a balance below its own fee are
	// three different problems with three different remedies.
	const blockedReason = (row: PlugBalance): string | undefined => {
		const { token, balance } = row;

		if (isEvm(row)) {
			return replacePlaceholders($i18n.plug_import.text.send_needs_gas, {
				$symbol: nativeSymbol(token.network.id) ?? token.symbol
			});
		}

		if (!isPlugSweepableToken(token)) {
			return $i18n.plug_import.text.send_unsupported_chain;
		}

		if (isNullish(plugSweepableAmount({ token, balance }))) {
			return replacePlaceholders($i18n.plug_import.text.send_below_fee, { $symbol: token.symbol });
		}

		return undefined;
	};

	const nativeSymbol = (networkId: NetworkId): string | undefined =>
		(balances ?? []).find(
			({ token }) => token.network.id === networkId && !isPlugEvmContractToken(token)
		)?.token.symbol;

	let loaded = $derived(nonNullish(balances));

	// A zero balance is noise on a migration screen — the user is looking for what is
	// there to move. Rows whose lookup failed are kept, because "unavailable" and
	// "empty" must not look the same.
	let visible = $derived(
		(balances ?? []).filter(({ balance }) => isNullish(balance) || balance > ZERO)
	);
</script>

<div
	class="mb-4 flex w-full flex-col gap-3 rounded-lg bg-primary p-4"
	data-tid={PLUG_IMPORT_ACCOUNT}
>
	<span class="font-bold"
		>{replacePlaceholders($i18n.plug_import.text.account, {
			$index: `${account.index + 1}`
		})}</span
	>

	<div class="flex flex-row items-center gap-2">
		<span class="text-tertiary">{$i18n.plug_import.text.principal}</span>
		<span>{shortenWithMiddleEllipsis({ text: account.principal })}</span>
		<Copy inline text={$i18n.plug_import.text.principal} value={account.principal} />
	</div>

	{#if !loaded}
		<span class="text-tertiary">{$i18n.plug_import.text.balance_loading}</span>
	{:else if visible.length === 0}
		<span class="text-tertiary">{$i18n.plug_import.text.empty_account}</span>
	{:else}
		<ul class="flex w-full flex-col gap-2">
			{#each visible as row (plugRowKey(row))}
				{@const { token, address, balance } = row}
				{@const rowKey = plugRowKey(row)}
				{@const amount = sendableAmount(row)}
				{@const reason = blockedReason(row)}

				<li class="flex w-full flex-row items-center justify-between gap-3">
					<span class="flex flex-col">
						<span class="font-bold">{token.symbol}</span>
						<span class="text-sm text-tertiary">{token.network.name}</span>
					</span>

					<span class="flex flex-row items-center gap-3">
						<span class="flex flex-col items-end">
							<span>
								{#if nonNullish(balance)}
									{formatToken({ value: balance, unitName: token.decimals })}
								{:else}
									{$i18n.plug_import.text.balance_unavailable}
								{/if}
							</span>
							<span class="text-sm text-tertiary"
								>{shortenWithMiddleEllipsis({ text: address })}</span
							>
						</span>

						{#if nonNullish(amount)}
							<ConfirmButtonWithModal
								onConfirm={() => onsend({ balance: row, amount })}
								testId={`${PLUG_IMPORT_SEND_BUTTON}-${rowKey}`}
							>
								{#snippet title()}
									{$i18n.plug_import.text.send_confirm_title}
								{/snippet}

								{#snippet button(onclick)}
									<Button
										disabled={nonNullish(sending)}
										loading={sending === rowKey}
										{onclick}
										paddingSmall
										testId={`${PLUG_IMPORT_SEND_BUTTON}-${rowKey}`}
										type="button"
									>
										{$i18n.plug_import.text.send_to_wallet}
									</Button>
								{/snippet}

								<p>
									{#if isPlugEvmContractToken(token)}
										{replacePlaceholders($i18n.plug_import.text.send_confirm_description_gas, {
											$amount: formatToken({ value: amount, unitName: token.decimals }),
											$symbol: token.symbol,
											$native: nativeSymbol(token.network.id) ?? ''
										})}
									{:else}
										{replacePlaceholders($i18n.plug_import.text.send_confirm_description, {
											$amount: formatToken({ value: amount, unitName: token.decimals }),
											$symbol: token.symbol
										})}
									{/if}
								</p>
							</ConfirmButtonWithModal>
						{:else if nonNullish(reason)}
							<span
								class="max-w-48 text-right text-sm text-tertiary"
								data-tid={`${PLUG_IMPORT_SEND_DISABLED}-${rowKey}`}>{reason}</span
							>
						{/if}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
