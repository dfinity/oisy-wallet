<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import type { SolSimulationControlField, SolSimulationPreview } from '$sol/types/sol-simulation';
	import type { SplTokenAddress } from '$sol/types/spl';

	interface Props {
		preview: SolSimulationPreview;
		// Native token of the network the request targets, which the SOL delta is denominated in.
		feeToken: Token;
	}

	let { preview, feeToken }: Props = $props();

	let { solDelta, tokenDeltas, controlChanges } = $derived(preview);

	// The same mint can exist on several clusters, so the network is matched too.
	const symbol = (tokenAddress: SplTokenAddress): string =>
		$enabledSplTokens.find(
			({ address, network: { id } }) => address === tokenAddress && id === feeToken.network.id
		)?.symbol ?? shortenWithMiddleEllipsis({ text: tokenAddress });

	const signedAmount = ({ delta, decimals }: { delta: bigint; decimals: number }): string =>
		`${delta > ZERO ? '+' : '-'}${formatToken({
			value: delta > ZERO ? delta : -delta,
			unitName: decimals,
			displayDecimals: decimals
		})}`;

	const controlLabels: Record<SolSimulationControlField, string> = $derived({
		owner: $i18n.wallet_connect.text.simulation_new_owner,
		delegate: $i18n.wallet_connect.text.simulation_new_spender,
		closeAuthority: $i18n.wallet_connect.text.simulation_new_close_authority,
		program: $i18n.wallet_connect.text.simulation_new_program
	});
</script>

<!-- An authority change moves no funds at all, so it would be invisible among the amounts. It is
     named first, on its own, because it is the one that hands over the account itself. -->
{#if controlChanges.length > 0}
	<MessageBox level="warning">{$i18n.wallet_connect.text.simulation_control_change}</MessageBox>
{/if}

<WalletConnectModalValue
	label={$i18n.wallet_connect.text.simulated_changes}
	ref="simulated-changes"
>
	<div class="flex flex-col gap-2">
		{#if nonNullish(solDelta)}
			<span data-tid="simulated-sol-delta">
				{`${signedAmount({ delta: solDelta, decimals: feeToken.decimals })} ${feeToken.symbol}`}
			</span>
		{/if}

		{#each tokenDeltas as { account, tokenAddress, decimals, delta } (`${account}-${tokenAddress}`)}
			<span data-tid="simulated-token-delta">
				{`${signedAmount({ delta, decimals })} ${symbol(tokenAddress)}`}
			</span>
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
