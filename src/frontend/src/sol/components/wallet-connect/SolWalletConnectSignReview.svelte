<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import SendDataSpender from '$lib/components/send/SendDataSpender.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectData from '$lib/components/wallet-connect/WalletConnectData.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { maxBigInt } from '$lib/utils/bigint.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import SolWalletConnectInstructions from '$sol/components/wallet-connect/SolWalletConnectInstructions.svelte';
	import SolWalletConnectSimulationPreview from '$sol/components/wallet-connect/SolWalletConnectSimulationPreview.svelte';
	import SolWalletConnectTransferParties from '$sol/components/wallet-connect/SolWalletConnectTransferParties.svelte';
	import {
		SOLANA_PRIORITIZATION_FEE_BASELINE_FLOOR_USD,
		SOLANA_PRIORITIZATION_FEE_NOTICE_MULTIPLIER,
		SOLANA_PRIORITIZATION_FEE_WARNING_MULTIPLIER,
		SOLANA_TRANSACTION_FEE_IN_LAMPORTS
	} from '$sol/constants/sol.constants';
	import type { SolInstructionViewRow } from '$sol/types/sol-instructions-view';
	import type { SolSimulationPreview } from '$sol/types/sol-simulation';
	import type { SolTransferParties } from '$sol/types/sol-transaction';

	interface Props {
		amount?: bigint;
		destination: string;
		source: string;
		application: string;
		data?: string;
		token: Token;
		// Native token of the network the request targets. Fees are always paid in SOL, even
		// when the transaction itself moves an SPL token.
		feeToken: Token;
		prioritizationFee?: bigint;
		prioritizationFeeEstimate?: bigint;
		isApproval?: boolean;
		unreviewed?: boolean;
		// What a simulation says this message would do to the user's own accounts. Absent whenever
		// the simulation could not be obtained, in which case the review shows what it always has.
		preview?: SolSimulationPreview;
		// Who the transaction spends from, derived from the transfer instructions it contains. Where
		// the value ends up is left to the simulated balance changes. Absent until the decode settles.
		parties?: SolTransferParties;
		// What the message actually does to the user's own accounts, instruction by instruction.
		// Absent when the decode could not produce it, in which case the section is simply not shown.
		instructions?: SolInstructionViewRow[];
		instructionsTotal?: number;
		instructionsShown?: number;
		approveDisabled?: boolean;
		onApprove: () => void;
		onReject: () => void;
	}

	let {
		amount,
		destination,
		source,
		application,
		data,
		token,
		feeToken,
		prioritizationFee,
		prioritizationFeeEstimate,
		isApproval = false,
		unreviewed = false,
		preview,
		parties,
		instructions,
		instructionsTotal = 0,
		instructionsShown = 0,
		approveDisabled = false,
		onApprove,
		onReject
	}: Props = $props();

	let balance = $derived($balancesStore?.[token.id]?.data);

	// Instructions OISY cannot decode yield no amount and no balance worth showing: what the
	// transaction does is then told by the simulated changes alone. The rows are dropped rather
	// than filled with a zero the decode never produced.
	let decoded = $derived(nonNullish(amount));

	let feeExchangeRate = $derived($exchanges?.[feeToken.id]?.usd);

	let prioritizationFeeFloor = $derived(
		nonNullish(feeExchangeRate) && feeExchangeRate > 0
			? BigInt(
					Math.ceil(
						(SOLANA_PRIORITIZATION_FEE_BASELINE_FLOOR_USD / feeExchangeRate) *
							10 ** feeToken.decimals
					)
				)
			: undefined
	);

	// Whichever of the two arms is available carries the baseline on its own: an unknown exchange
	// rate leaves the network estimate, a failed estimate leaves the floor. With neither there is
	// nothing to call the fee unusual against, so the review shows it and says nothing about it.
	let prioritizationFeeBaseline = $derived(
		maxBigInt(prioritizationFeeFloor, prioritizationFeeEstimate)
	);

	let comparablePrioritizationFee = $derived(
		nonNullish(prioritizationFee) && nonNullish(prioritizationFeeBaseline)
			? { fee: prioritizationFee, baseline: prioritizationFeeBaseline }
			: undefined
	);

	let highPrioritizationFee = $derived(
		nonNullish(comparablePrioritizationFee) &&
			comparablePrioritizationFee.fee >=
				comparablePrioritizationFee.baseline * SOLANA_PRIORITIZATION_FEE_WARNING_MULTIPLIER
	);

	let dappPrioritizationFee = $derived(
		!highPrioritizationFee &&
			nonNullish(comparablePrioritizationFee) &&
			comparablePrioritizationFee.fee >=
				comparablePrioritizationFee.baseline * SOLANA_PRIORITIZATION_FEE_NOTICE_MULTIPLIER
	);
</script>

{#snippet feeValue(feeAmount: bigint)}
	{@const formattedFee = formatToken({
		value: feeAmount,
		unitName: feeToken.decimals,
		displayDecimals: feeToken.decimals
	})}

	<div class="flex gap-4">
		{`${formattedFee} ${feeToken.symbol}`}

		<div class="text-tertiary">
			<ConvertAmountExchange amount={formattedFee} exchangeRate={feeExchangeRate} />
		</div>
	</div>
{/snippet}

<ContentWithToolbar>
	{#if unreviewed}
		<MessageBox level="warning">{$i18n.wallet_connect.text.unreviewed_instructions}</MessageBox>
	{/if}

	{#if dappPrioritizationFee}
		<MessageBox level="info">{$i18n.wallet_connect.text.dapp_prioritization_fee}</MessageBox>
	{:else if highPrioritizationFee}
		<MessageBox level="warning">{$i18n.wallet_connect.text.high_prioritization_fee}</MessageBox>
	{/if}

	{#if nonNullish(preview)}
		<MessageBox level="plain">{$i18n.wallet_connect.text.simulation_note}</MessageBox>
	{/if}

	<!-- The review names no recipient of its own: a single destination had to pick one winner out
	     of a swap, and where the value ends up is what the simulated balance changes describe. An
	     approval is the exception, since its delegate is not a recipient and keeps its own row. -->
	<!-- The signer is the connected account and never varies between the requests of a session, so
	     here it costs a row without saying anything about the message in front of the user. The
	     Ethereum review keeps the row, which is why this is opted out rather than removed. -->
	<SendData
		{amount}
		{application}
		{balance}
		destination={null}
		showAmount={decoded}
		showBalance={decoded}
		showSigner={false}
		{source}
		{token}
	>
		{#if isApproval}
			<SendDataSpender spender={destination} />
		{/if}

		{#if nonNullish(parties)}
			<SolWalletConnectTransferParties {parties} userAddress={source} />
		{/if}

		{#if nonNullish(preview)}
			<SolWalletConnectSimulationPreview {feeToken} {preview} />
		{/if}

		{#if nonNullish(instructions)}
			<SolWalletConnectInstructions
				rows={instructions}
				shown={instructionsShown}
				total={instructionsTotal}
			/>
		{/if}

		<WalletConnectModalValue label={$i18n.fee.text.network_fee} ref="network-fee">
			{@render feeValue(SOLANA_TRANSACTION_FEE_IN_LAMPORTS)}
		</WalletConnectModalValue>

		{#if nonNullish(prioritizationFee)}
			<WalletConnectModalValue label={$i18n.fee.text.prioritization_fee} ref="prioritization-fee">
				{@render feeValue(prioritizationFee)}
			</WalletConnectModalValue>
		{/if}

		<WalletConnectData {data} label={$i18n.wallet_connect.text.hex_data} />

		<!-- TODO: add checks for insufficient funds if and when we are able to correctly parse the amount -->

		{#snippet sourceNetwork()}
			<WalletConnectModalValue label={$i18n.send.text.network} ref="network">
				<NetworkWithLogo network={token.network} />
			</WalletConnectModalValue>
		{/snippet}
	</SendData>

	{#snippet toolbar()}
		<WalletConnectActions {approveDisabled} {onApprove} {onReject} />
	{/snippet}
</ContentWithToolbar>
