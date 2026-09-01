<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import SendDataSpender from '$lib/components/send/SendDataSpender.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectData from '$lib/components/wallet-connect/WalletConnectData.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { absBigInt, maxBigInt } from '$lib/utils/bigint.utils';
	import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
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
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import { splTokenMetadataStore } from '$sol/stores/spl-token-metadata.store';
	import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
	import type { SolSimulationPreview } from '$sol/types/sol-simulation';
	import type { SolTransferParties } from '$sol/types/sol-transaction';
	import type { SolTransactionSummary } from '$sol/types/sol-transaction-summary';
	import { solMessageMatchesSimulation } from '$sol/utils/sol-message-summary.utils';
	import { solTokenSymbol, solUnknownTokenAddresses } from '$sol/utils/sol-token-name.utils';
	import {
		flattenInstructions,
		formatSolTransactionSummary
	} from '$sol/utils/sol-transaction-summary.utils';

	interface Props {
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
		// What the message says it moves, read from its own instructions. Stated to the user only
		// when the simulated run agrees with it.
		messageSummary?: SolTransactionSummary;
		// Who the transaction spends from, derived from the transfer instructions it contains. Where
		// the value ends up is left to the simulated balance changes. Absent until the decode settles.
		parties?: SolTransferParties;
		approveDisabled?: boolean;
		onApprove: () => void;
		onReject: () => void;
	}

	let {
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
		messageSummary,
		parties,
		approveDisabled = false,
		onApprove,
		onReject
	}: Props = $props();

	let activeTab = $state('summary');

	// What the token accounts cost this message: the rent of the ones it opens, less what the ones
	// it closes hand back. Charged like a fee and part of neither the base nor the bid, so it is
	// stated as its own line rather than folded into either.
	let ataFee = $derived(
		maxBigInt(
			(instructions ?? []).reduce((acc, { kind, rent, returned }) => {
				if (kind === 'createTokenAccount' && nonNullish(rent)) {
					return acc + rent;
				}

				// A message that opens one account and closes another charges the difference. Netting
				// below zero would turn a refund into a negative fee, which is not what a fee is.
				return kind === 'closeTokenAccount' && nonNullish(returned) ? acc - returned : acc;
			}, ZERO),
			ZERO
		)
	);

	let feeExchangeRate = $derived($exchanges?.[feeToken.id]?.usd);

	// What the transaction costs beyond what it moves. The simulated SOL balance carries all of it
	// and the message states none of it, so it is the room the comparison of the two allows.
	let costs = $derived(SOLANA_TRANSACTION_FEE_IN_LAMPORTS + (prioritizationFee ?? ZERO) + ataFee);

	// The message read on its own says a plain send, receive or swap, and the run agrees that this
	// is all it does. Anything less than agreement is left unsaid: a confident sentence over a
	// transaction that does something else is worse than no sentence at all.
	let statedSummary = $derived(
		nonNullish(messageSummary) &&
			nonNullish(preview) &&
			solMessageMatchesSimulation({ summary: messageSummary, preview, costs })
			? messageSummary
			: undefined
	);

	// The programs the run went through, in the order it reached them and each named once. The
	// message names none of them itself: a routed swap performs every call inside another program.
	let venues = $derived([
		...new Set(
			flattenInstructions(instructions ?? [])
				.map(({ program }) => program)
				.filter(nonNullish)
		)
	]);

	// The mints this line names, so an unnamed one is numbered against the others it stands with.
	let summaryTokenAddresses = $derived(
		solUnknownTokenAddresses({
			tokenAddresses: [statedSummary?.spent, statedSummary?.received].map(
				(change) => change?.tokenAddress
			),
			tokens: $enabledSplTokens,
			networkId: token.network.id,
			metadata: $splTokenMetadataStore
		})
	);

	let summaryText = $derived(
		nonNullish(statedSummary)
			? formatSolTransactionSummary({
					summary: statedSummary,
					i18n: $i18n,
					symbolOf: (tokenAddress) =>
						solTokenSymbol({
							tokenAddress,
							tokens: $enabledSplTokens,
							networkId: token.network.id,
							metadata: $splTokenMetadataStore,
							unknownTokenAddresses: summaryTokenAddresses,
							unknownTokenLabel: $i18n.transaction.text.unknown_token,
							nativeSymbol: feeToken.symbol
						}),
					amountOf: ({ delta, decimals }) =>
						formatToken({
							value: absBigInt(delta),
							unitName: decimals ?? feeToken.decimals,
							displayDecimals: decimals ?? feeToken.decimals
						})
				})
			: undefined
	);

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

{#snippet feeValue({ kind, feeAmount }: { kind: string; feeAmount: bigint })}
	{@const formattedFee = formatToken({
		value: feeAmount,
		unitName: feeToken.decimals,
		displayDecimals: feeToken.decimals
	})}

	<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
		<span class="text-tertiary">{kind}</span>

		<span>{`${formattedFee} ${feeToken.symbol}`}</span>

		<div class="text-tertiary">
			<ConvertAmountExchange amount={formattedFee} exchangeRate={feeExchangeRate} />
		</div>
	</div>
{/snippet}

<ContentWithToolbar>
	<!-- One notice, whichever fits. A message OISY could not decode is a warning either way, and
	     says the review is simulated only when a simulation was in fact obtained, since one can
	     fail. A message that decoded but does not reduce to a send, a receive or a swap the run
	     agrees with is the case the user has to read the detail for, so it says so; it names the
	     simulated changes, so it waits for a run to exist and for the decode to settle, and the
	     absence of a run has a warning of its own. A message that does reduce still shows
	     simulated figures, which is a caveat and no more. -->
	{#if unreviewed}
		<MessageBox level="warning">
			{nonNullish(preview)
				? $i18n.wallet_connect.text.unreviewed_instructions_simulated
				: $i18n.wallet_connect.text.unreviewed_instructions}
		</MessageBox>
	{:else if nonNullish(preview) && !approveDisabled && isNullish(statedSummary)}
		<MessageBox level="warning">{$i18n.wallet_connect.text.multiple_operations}</MessageBox>
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

	<!-- What the message itself says it does, in one line, before the rows that say it in detail.
	     Stated as plain text and not as a heading: it is a reading of the transaction, and the
	     figures under it are what the user checks it against. -->
	{#if nonNullish(summaryText)}
		<p class="my-4 text-primary" data-tid="message-summary">{summaryText}</p>
	{/if}

	<!-- What the transaction does, and separately what it is made of. The operations are the
	     material a user checks the summary against, not part of the summary: on a routed swap they
	     are a dozen lines, and above the amounts they bury the one figure that matters. -->
	<Tabs
		styleClass="mt-4"
		tabs={[
			{ label: $i18n.transaction.text.tab_summary, id: 'summary' },
			{ label: $i18n.wallet_connect.text.tab_operations, id: 'operations' }
		]}
		bind:activeTab
	>
		{#if activeTab === 'summary'}
			<!-- The review names no recipient of its own: a single destination had to pick one winner out
	     of a swap, and where the value ends up is what the simulated balance changes describe. An
	     approval is the exception, since its delegate is not a recipient and keeps its own row. -->
			<!-- The signer is the connected account and never varies between the requests of a session, so
	     here it costs a row without saying anything about the message in front of the user. The
	     Ethereum review keeps the row, which is why this is opted out rather than removed. -->
			<SendData
				{application}
				destination={null}
				showAmount={false}
				showBalance={false}
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

				<!-- Where the transaction would run. A program is the closest thing a Solana message has to
			     a recipient, and it is the one party the user can look up before signing, so each is
			     listed with the actions to copy it or open it. -->
				{#if venues.length > 0}
					<WalletConnectModalValue label={$i18n.transaction.text.swap_on} ref="venues">
						<div class="flex flex-col gap-1">
							{#each venues as venue (venue)}
								<span class="flex items-center gap-1" data-tid="venue">
									{shortenWithMiddleEllipsis({ text: venue })}

									<SolAddressActions address={venue} network={token.network} />
								</span>
							{/each}
						</div>
					</WalletConnectModalValue>
				{/if}

				<!-- One heading, and under it what the transaction actually charges: the base fee every
		     message pays, what it bids on top, and the rent of any account it opens. Three headings
		     read as three unrelated costs. -->
				<WalletConnectModalValue label={$i18n.fee.text.fee} ref="fee">
					<div class="flex flex-col gap-1">
						<div data-tid="network-fee">
							{@render feeValue({
								kind: $i18n.fee.text.base_kind,
								feeAmount: SOLANA_TRANSACTION_FEE_IN_LAMPORTS
							})}
						</div>

						{#if nonNullish(prioritizationFee)}
							<div data-tid="prioritization-fee">
								{@render feeValue({
									kind: $i18n.fee.text.prioritization_kind,
									feeAmount: prioritizationFee
								})}
							</div>
						{/if}

						{#if ataFee > ZERO}
							<div data-tid="ata-fee">
								{@render feeValue({ kind: $i18n.fee.text.ata_kind, feeAmount: ataFee })}
							</div>
						{/if}
					</div>
				</WalletConnectModalValue>

				<!-- TODO: add checks for insufficient funds if and when we are able to correctly parse the amount -->

				{#snippet sourceNetwork()}
					<WalletConnectModalValue label={$i18n.send.text.network} ref="network">
						<NetworkWithLogo network={token.network} />
					</WalletConnectModalValue>
				{/snippet}
			</SendData>
		{:else}
			<!-- What the simulated run actually does, which the message itself states almost none of:
			     a routed swap performs every transfer as a nested call. Shown here rather than left
			     to the hex, which nobody can read. -->
			{#if nonNullish(instructions) && instructions.length > 0}
				<WalletConnectModalValue
					label={$i18n.transaction.text.tab_instructions}
					ref="contained-instructions"
				>
					<!-- The simulated deltas carry the decimals of a mint the wallet does not list,
					     which an unchecked transfer does not state and the list would otherwise read
					     raw. -->
					<SolInstructionsList {instructions} netChanges={preview?.tokenDeltas} {token} />
				</WalletConnectModalValue>
			{/if}

			<WalletConnectData {data} label={$i18n.wallet_connect.text.hex_data} />
		{/if}
	</Tabs>

	{#snippet toolbar()}
		<WalletConnectActions {approveDisabled} {onApprove} {onReject} />
	{/snippet}
</ContentWithToolbar>
