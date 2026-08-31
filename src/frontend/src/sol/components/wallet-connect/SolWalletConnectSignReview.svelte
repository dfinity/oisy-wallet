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
	import { ZERO } from '$lib/constants/app.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { maxBigInt } from '$lib/utils/bigint.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import SolInstructionsList from '$sol/components/transactions/SolInstructionsList.svelte';
	import SolAddressActions from '$sol/components/wallet-connect/SolAddressActions.svelte';
	import SolWalletConnectSimulationPreview from '$sol/components/wallet-connect/SolWalletConnectSimulationPreview.svelte';
	import SolWalletConnectTransferParties from '$sol/components/wallet-connect/SolWalletConnectTransferParties.svelte';
	import {
		SOLANA_PRIORITIZATION_FEE_BASELINE_FLOOR_USD,
		SOLANA_PRIORITIZATION_FEE_NOTICE_MULTIPLIER,
		SOLANA_PRIORITIZATION_FEE_WARNING_MULTIPLIER,
		SOLANA_TRANSACTION_FEE_IN_LAMPORTS
	} from '$sol/constants/sol.constants';
	import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
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
		// What the simulated run does, instruction by instruction. The rent of the accounts it opens
		// is the only part the fee block reads; rendering the list itself comes separately.
		instructions?: SolInstructionSummary[];
		// Who the transaction spends from, derived from the transfer instructions it contains. Where
		// the value ends up is left to the simulated balance changes. Absent until the decode settles.
		parties?: SolTransferParties;
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
		instructions,
		parties,
		approveDisabled = false,
		onApprove,
		onReject
	}: Props = $props();

	let balance = $derived($balancesStore?.[token.id]?.data);

	// Instructions OISY cannot decode yield no amount and no balance worth showing: what the
	// transaction does is then told by the simulated changes alone. The rows are dropped rather
	// than filled with a zero the decode never produced.
	let decoded = $derived(nonNullish(amount));

	// The rent of the token accounts this message opens. It is charged like a fee and is not part
	// of the base or the bid, so it is stated as its own line rather than folded into either.
	let ataFee = $derived(
		(instructions ?? []).reduce(
			(acc, { kind, rent }) =>
				kind === 'createTokenAccount' && nonNullish(rent) ? acc + rent : acc,
			ZERO
		)
	);

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
	<!-- One notice about how the review was obtained, not two. What varies is what is actually
	     known: a message that could not be decoded is a warning either way, and says the review is
	     simulated only when a simulation was in fact obtained, since one can fail. A message that
	     decoded still shows simulated figures, which is a caveat and no more. -->
	{#if unreviewed}
		<MessageBox level="warning">
			{nonNullish(preview)
				? $i18n.wallet_connect.text.unreviewed_instructions_simulated
				: $i18n.wallet_connect.text.unreviewed_instructions}
		</MessageBox>
	{:else if nonNullish(preview)}
		<MessageBox level="info">{$i18n.wallet_connect.text.simulated_review}</MessageBox>
	{/if}

	<!-- An authority change moves no funds at all, so a diff of amounts alone would describe the
	     theft as nothing happening. It is named first among the fund warnings for that reason. -->
	{#if nonNullish(preview) && preview.controlChanges.length > 0}
		<MessageBox level="warning">{$i18n.wallet_connect.text.simulation_control_change}</MessageBox>
	{/if}

	<!-- Stated whenever the parties were derived from top-level instructions alone, not only when
	     something visibly failed: an empty list on a transaction that clearly spends something is
	     the single most dangerous thing this review can show. -->
	{#if parties?.partial === true}
		<MessageBox level="warning">{$i18n.wallet_connect.text.transfer_parties_partial}</MessageBox>
	{/if}

	{#if dappPrioritizationFee}
		<MessageBox level="info">{$i18n.wallet_connect.text.dapp_prioritization_fee}</MessageBox>
	{:else if highPrioritizationFee}
		<MessageBox level="warning">{$i18n.wallet_connect.text.high_prioritization_fee}</MessageBox>
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
			<SendDataSpender spender={destination}>
				{#snippet actions()}
					<SolAddressActions address={destination} network={token.network} />
				{/snippet}
			</SendDataSpender>
		{/if}

		{#if nonNullish(parties)}
			<SolWalletConnectTransferParties network={token.network} {parties} userAddress={source} />
		{/if}

		{#if nonNullish(preview)}
			<SolWalletConnectSimulationPreview {feeToken} {preview} />
		{/if}

		<!-- One heading, and under it what the transaction actually charges: the base fee every
		     message pays, what it bids on top, and the rent of any account it opens. Three headings
		     read as three unrelated costs. -->
		<WalletConnectModalValue label={$i18n.fee.text.fee} ref="fee">
			<div class="flex flex-col gap-2">
				<div class="flex flex-col" data-tid="network-fee">
					<span class="text-tertiary">{$i18n.fee.text.network_fee}</span>
					{@render feeValue(SOLANA_TRANSACTION_FEE_IN_LAMPORTS)}
				</div>

				{#if nonNullish(prioritizationFee)}
					<div class="flex flex-col" data-tid="prioritization-fee">
						<span class="text-tertiary">{$i18n.fee.text.prioritization_fee}</span>
						{@render feeValue(prioritizationFee)}
					</div>
				{/if}

				{#if ataFee > ZERO}
					<div class="flex flex-col" data-tid="ata-fee">
						<span class="text-tertiary">{$i18n.fee.text.ata_fee}</span>
						{@render feeValue(ataFee)}
					</div>
				{/if}
			</div>
		</WalletConnectModalValue>

		<!-- What the simulated run actually does, which the message itself states almost none of: a
		     routed swap performs every transfer as a nested call. Shown here rather than left to the
		     hex, which nobody can read. -->
		{#if nonNullish(instructions) && instructions.length > 0}
			<WalletConnectModalValue
				label={$i18n.transaction.text.tab_instructions}
				ref="contained-instructions"
			>
				<SolInstructionsList {instructions} {token} />
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
