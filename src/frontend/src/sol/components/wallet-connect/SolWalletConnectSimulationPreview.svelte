<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import type { SolSimulationControlField, SolSimulationPreview } from '$sol/types/sol-simulation';
	import type { SplTokenAddress } from '$sol/types/spl';
	import type { SplCustomToken } from '$sol/types/spl-custom-token';

	interface Props {
		preview: SolSimulationPreview;
		// Native token of the network the request targets, which the SOL delta is denominated in.
		feeToken: Token;
	}

	let { preview, feeToken }: Props = $props();

	let { solDelta, tokenDeltas, controlChanges } = $derived(preview);

	// The same mint can exist on several clusters, so the network is matched too.
	const splToken = (tokenAddress: SplTokenAddress): SplCustomToken | undefined =>
		$enabledSplTokens.find(
			({ address, network: { id } }) => address === tokenAddress && id === feeToken.network.id
		);

	const symbol = (tokenAddress: SplTokenAddress): string =>
		splToken(tokenAddress)?.symbol ?? shortenWithMiddleEllipsis({ text: tokenAddress });

	// A mint OISY does not know has no rate of its own, and no other token's rate describes it, so
	// such a delta is left as a bare amount rather than priced against something it is not.
	const splExchangeRate = (tokenAddress: SplTokenAddress): number | undefined => {
		const token = splToken(tokenAddress);

		return nonNullish(token) ? $exchanges?.[token.id]?.usd : undefined;
	};

	let feeExchangeRate = $derived($exchanges?.[feeToken.id]?.usd);

	const controlLabels: Record<SolSimulationControlField, string> = $derived({
		owner: $i18n.wallet_connect.text.simulation_new_owner,
		delegate: $i18n.wallet_connect.text.simulation_new_spender,
		closeAuthority: $i18n.wallet_connect.text.simulation_new_close_authority,
		program: $i18n.wallet_connect.text.simulation_new_program
	});
</script>

{#snippet delta({
	value,
	decimals,
	tokenSymbol,
	exchangeRate
}: {
	value: bigint;
	decimals: number;
	tokenSymbol: string;
	exchangeRate?: number;
})}
	{@const magnitude = formatToken({
		value: value > ZERO ? value : -value,
		unitName: decimals,
		displayDecimals: decimals
	})}

	{`${value > ZERO ? '+' : '-'}${magnitude} ${tokenSymbol}`}

	<!-- The sign is carried once, by the amount: the fiat figure prices the size of the change. -->
	<div class="text-tertiary">
		<ConvertAmountExchange amount={magnitude} {exchangeRate} />
	</div>
{/snippet}

<!-- An authority change moves no funds at all, so it would be invisible among the amounts. It is
     named first, on its own, because it is the one that hands over the account itself. -->
{#if controlChanges.length > 0}
	<MessageBox level="warning">{$i18n.wallet_connect.text.simulation_control_change}</MessageBox>
{/if}

<WalletConnectModalValue
	label={$i18n.wallet_connect.text.simulated_changes}
	ref="simulated-changes"
>
	<div class="flex flex-col gap-1">
		{#if nonNullish(solDelta)}
			<div class="flex gap-4" data-tid="simulated-sol-delta">
				{@render delta({
					value: solDelta,
					decimals: feeToken.decimals,
					tokenSymbol: feeToken.symbol,
					exchangeRate: feeExchangeRate
				})}
			</div>
		{/if}

		{#each tokenDeltas as { account, tokenAddress, decimals, delta: tokenDelta } (`${account}-${tokenAddress}`)}
			<div class="flex gap-4" data-tid="simulated-token-delta">
				{@render delta({
					value: tokenDelta,
					decimals,
					tokenSymbol: symbol(tokenAddress),
					exchangeRate: splExchangeRate(tokenAddress)
				})}
			</div>
		{/each}

		{#each controlChanges as { account, field, to } (`${account}-${field}`)}
			<span class="flex flex-col gap-1" data-tid="simulated-control-change">
				<span class="text-tertiary">
					{`${controlLabels[field]} · ${shortenWithMiddleEllipsis({ text: account })}`}
				</span>
				{to ?? $i18n.wallet_connect.text.simulation_control_removed}
			</span>
		{/each}
	</div>
</WalletConnectModalValue>

<MessageBox level="plain">{$i18n.wallet_connect.text.simulation_note}</MessageBox>
