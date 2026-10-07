<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import EthFeePriority from '$eth/components/fee/EthFeePriority.svelte';
	import EthWalletConnectCallMethods from '$eth/components/wallet-connect/EthWalletConnectCallMethods.svelte';
	import {
		ETH_WALLET_CONNECT_GAS_BASELINE_FLOOR,
		ETH_WALLET_CONNECT_GAS_NOTICE_MULTIPLIER,
		ETH_WALLET_CONNECT_GAS_WARNING_MULTIPLIER
	} from '$eth/constants/eth.constants';
	import { ercFungibleTokens } from '$eth/derived/erc-fungible.derived';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { WalletConnectEthCall } from '$eth/types/wallet-connect';
	import { decodeErc20AbiData, decodeSetApprovalForAllData } from '$eth/utils/transactions.utils';
	import {
		findWalletConnectEthErc20Token,
		walletConnectEthRefusals
	} from '$eth/utils/wallet-connect.utils';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import SendDataSpender from '$lib/components/send/SendDataSpender.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectData from '$lib/components/wallet-connect/WalletConnectData.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import WalletConnectUncheckedSigning from '$lib/components/wallet-connect/WalletConnectUncheckedSigning.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Network } from '$lib/types/network';
	import { maxBigInt } from '$lib/utils/bigint.utils';

	interface Props {
		amount: bigint;
		destination: string;
		application: string;
		data?: string;
		// What the calldata says this request is. Every state below is derived from it, so a request
		// whose calldata OISY cannot read arrives here as `unknown` and is reviewed as unknown,
		// rather than falling through to the native summary the way it used to.
		call: WalletConnectEthCall;
		// The gas limit the dApp asked for, when it asked for one. It is what gets signed, so it is
		// also what the maximum fee below is priced on.
		requestedGas?: bigint;
		sourceNetwork: EthereumNetwork;
		targetNetwork?: Network;
		// Whether WalletConnect's domain verification flagged the site. No way past a refusal is
		// offered then, and the review does not point at the Settings switch either.
		domainFlagged?: boolean;
		// Whether the Settings switch was on when the review opened, so that a refusal can be signed
		// past once the user acknowledges it, and whether they have.
		uncheckedSigningOffered?: boolean;
		uncheckedSigningAcknowledged?: boolean;
		approveDisabled?: boolean;
		onApprove: () => void;
		onReject: () => void;
		onUncheckedSigningAcknowledge: () => void;
		onOpenSettings: () => void;
	}

	let {
		amount,
		destination,
		application,
		data,
		call,
		requestedGas,
		sourceNetwork: sourceNetworkProp,
		targetNetwork,
		domainFlagged = false,
		uncheckedSigningOffered = false,
		uncheckedSigningAcknowledged = false,
		approveDisabled = false,
		onApprove,
		onReject,
		onUncheckedSigningAcknowledge,
		onOpenSettings
	}: Props = $props();

	const { feeStore }: EthFeeContext = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	// Unused gas is refunded, so a high limit is not a fee on its own. It is a ceiling the user
	// authorizes, and a contract that consumes all of it burns the whole amount, which is why the
	// review prices the limit that will be signed rather than the one OISY would have used.
	let signedGas = $derived(requestedGas ?? $feeStore?.gas);

	let baselineGas = $derived(maxBigInt(ETH_WALLET_CONNECT_GAS_BASELINE_FLOOR, $feeStore?.gas));

	// A request that carries no limit of its own is signed with the estimate, so there is nothing to
	// judge and the review says nothing about it.
	let highGasLimit = $derived(
		nonNullish(requestedGas) &&
			requestedGas >= baselineGas * ETH_WALLET_CONNECT_GAS_WARNING_MULTIPLIER
	);

	let dappGasLimit = $derived(
		!highGasLimit &&
			nonNullish(requestedGas) &&
			requestedGas >= baselineGas * ETH_WALLET_CONNECT_GAS_NOTICE_MULTIPLIER
	);

	let erc20Approve = $derived(call.type === 'erc20Approve');

	let erc20Transfer = $derived(call.type === 'erc20Transfer');

	let setApprovalForAll = $derived(call.type === 'setApprovalForAll');

	// `increaseAllowance` and `decreaseAllowance` carry `(address spender, uint256 delta)`, the same
	// arguments as `approve`, so they resolve their token, decode their spender and fail closed
	// through the very same path. Only the copy differs, because the amount is a change to the
	// allowance rather than the allowance itself.
	let allowanceDelta = $derived(call.type === 'erc20AllowanceDelta');

	let allowanceIncrease = $derived(call.type === 'erc20AllowanceDelta' && call.increase);

	let unknownCall = $derived(call.type === 'unknown');

	let erc20 = $derived(erc20Approve || erc20Transfer || allowanceDelta);

	let decodedErc20Data = $derived.by(() => {
		if (!erc20 || isNullish(data)) {
			return;
		}

		try {
			return decodeErc20AbiData({ data });
		} catch (_: unknown) {
			// Calldata that does not decode must not be summarized: the review would
			// otherwise describe something else than what gets signed and broadcast.
		}
	});

	let spender = $derived(erc20Approve || allowanceDelta ? decodedErc20Data?.to : undefined);

	let decodedSetApprovalForAll = $derived.by(() => {
		if (!setApprovalForAll || isNullish(data)) {
			return;
		}

		try {
			return decodeSetApprovalForAllData(data);
		} catch (_: unknown) {
			// Calldata that does not decode must not be summarized: the review would
			// otherwise describe something else than what gets signed and broadcast.
		}
	});

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let token = $derived(
		erc20
			? findWalletConnectEthErc20Token({
					tokens: $ercFungibleTokens,
					destination,
					networkId: sourceNetworkProp.id
				})
			: $sendToken
	);

	let amountDisplay = $derived(erc20 ? decodedErc20Data?.value : amount);

	// A transfer moves tokens to the address encoded in the calldata, not to the
	// contract the transaction is addressed to.
	let destinationDisplay = $derived(erc20Transfer ? (decodedErc20Data?.to ?? null) : destination);

	// Fail closed: without both the token and its decoded calldata, the review cannot state what
	// the user would actually approve. This covers approve as well as transfer, since an
	// undecodable approve would otherwise render as a zero-amount interaction and stay approvable.
	let unverifiableErc20 = $derived(erc20 && (isNullish(decodedErc20Data) || isNullish(token)));

	// A token the wallet does not list is refused for good: adding it is what makes the request
	// reviewable, so the Settings switch never signs past it and the review says how to proceed.
	let unlistedErc20 = $derived(erc20 && isNullish(token));

	// What the Settings switch can sign past: calldata that does not decode, for an ERC-20 call on a
	// token the wallet lists and for an operator grant, whose operator is the whole of what it
	// authorizes. The signing service refuses the same list.
	let refusals = $derived(walletConnectEthRefusals({ call, data }));

	let refused = $derived(refusals.length > 0 && !unlistedErc20);

	let unverifiableSetApprovalForAll = $derived(refusals.includes('unverifiable_approval_for_all'));

	// An operator grant authorizes rather than moves, so it has no amount and no balance to spend
	// against. Native value carried alongside it is still real value leaving the wallet, and hiding
	// that would repeat, in the other direction, the summary this review exists to prevent.
	// A call OISY could not read is in the same position: the native value is all the review knows,
	// and a zero there is not a summary of the request. Printing "0 ETH" as the amount of an
	// unreviewed contract call is the misstatement this review exists to prevent, so the row is
	// dropped rather than filled with a figure that describes nothing.
	let noAmount = $derived((setApprovalForAll || unknownCall) && amount === ZERO);

	let balance = $derived(nonNullish(token) ? $balancesStore?.[token.id]?.data : undefined);

	// Names the fee rows for a screen reader. A `label` cannot do it: it only labels form controls,
	// so its `for` would be ignored here and the group would be announced without a name.
	const FEE_SECTION_LABEL = 'fee-label';

	let activeTab = $state('summary');
</script>

<ContentWithToolbar>
	{#if unknownCall}
		<MessageBox level="error" testId="wallet-connect-unknown-call">
			{$i18n.wallet_connect.text.unknown_call}
		</MessageBox>
	{:else if unlistedErc20}
		<MessageBox level="warning" testId="wallet-connect-unlisted-erc20-warning">
			{$i18n.wallet_connect.text.unlisted_erc20_request}
		</MessageBox>
	{:else if unverifiableErc20}
		<MessageBox level="warning" testId="wallet-connect-unverifiable-erc20-warning">
			{uncheckedSigningOffered
				? $i18n.wallet_connect.text.undecodable_erc20_reason
				: $i18n.wallet_connect.text.undecodable_erc20_request}
		</MessageBox>
	{:else if unverifiableSetApprovalForAll}
		<MessageBox level="warning" testId="wallet-connect-unverifiable-approval-for-all-warning">
			{uncheckedSigningOffered
				? $i18n.wallet_connect.text.unverifiable_approval_for_all_reason
				: $i18n.wallet_connect.text.unverifiable_approval_for_all_request}
		</MessageBox>
	{:else if nonNullish(decodedSetApprovalForAll)}
		<MessageBox
			level={decodedSetApprovalForAll.approved ? 'warning' : 'info'}
			testId="wallet-connect-approval-for-all"
		>
			{decodedSetApprovalForAll.approved
				? $i18n.wallet_connect.text.approval_for_all_grant
				: $i18n.wallet_connect.text.approval_for_all_revoke}
		</MessageBox>
	{:else if allowanceDelta}
		<MessageBox
			level={allowanceIncrease ? 'warning' : 'info'}
			testId="wallet-connect-allowance-delta"
		>
			{allowanceIncrease
				? $i18n.wallet_connect.text.allowance_increase
				: $i18n.wallet_connect.text.allowance_decrease}
		</MessageBox>
	{/if}

	{#if refused && !domainFlagged}
		<WalletConnectUncheckedSigning
			acknowledged={uncheckedSigningAcknowledged}
			offered={uncheckedSigningOffered}
			onAcknowledge={onUncheckedSigningAcknowledge}
			{onOpenSettings}
		/>
	{/if}

	<!-- Padding an estimate is ordinary dApp behaviour and unused gas is refunded, so both tiers
	     inform instead of blocking the way undecodable ERC20 calldata does. They sit with the other
	     warnings rather than in a tab, since a warning behind a tab is one the user need not see. -->
	{#if dappGasLimit}
		<MessageBox level="info" testId="wallet-connect-dapp-gas-limit">
			{$i18n.wallet_connect.text.dapp_gas_limit}
		</MessageBox>
	{:else if highGasLimit}
		<MessageBox level="warning" testId="wallet-connect-high-gas-limit">
			{$i18n.wallet_connect.text.high_gas_limit}
		</MessageBox>
	{/if}

	<Tabs
		contentStyleClass="mt-4"
		tabs={[
			{ label: $i18n.wallet_connect.text.tab_summary, id: 'summary' },
			{ label: $i18n.wallet_connect.text.tab_raw_data, id: 'raw' }
		]}
		bind:activeTab
	>
		{#if activeTab === 'summary'}
			<SendData
				amount={amountDisplay}
				{application}
				{balance}
				destination={destinationDisplay}
				showAmount={!noAmount}
				showBalance={!noAmount}
				showNullishAmountLabel={unverifiableErc20}
				showSigner={false}
				showUnlimitedAmountLabel={erc20Approve || allowanceIncrease}
				source={$ethAddress ?? ''}
				{token}
			>
				{#snippet sourceNetwork()}
					<WalletConnectModalValue label={$i18n.send.text.source_network} ref="source-network">
						<NetworkWithLogo network={sourceNetworkProp} />
					</WalletConnectModalValue>
				{/snippet}

				{#snippet destinationNetwork()}
					{#if nonNullish(targetNetwork)}
						<WalletConnectModalValue
							label={$i18n.send.text.destination_network}
							ref="destination-network"
						>
							<NetworkWithLogo network={targetNetwork} />
						</WalletConnectModalValue>
					{/if}
				{/snippet}

				{#if (erc20Approve || allowanceDelta) && nonNullish(spender)}
					<SendDataSpender {spender} />
				{:else if nonNullish(decodedSetApprovalForAll)}
					<SendDataSpender
						label={$i18n.wallet_connect.text.operator}
						ref="operator"
						spender={decodedSetApprovalForAll.operator}
					/>
				{/if}

				<!-- The fee is two rows that belong together, so it takes a heading like every other
				     block in this summary rather than trailing loose off the end of it. -->
				<span id={FEE_SECTION_LABEL} class="font-bold">{$i18n.fee.text.fee}</span>

				<div class="mb-4" aria-labelledby={FEE_SECTION_LABEL} role="group">
					<EthFeePriority gas={signedGas} styleClass="mb-2" />

					<EthFeeDisplay estimated gas={signedGas}>
						{#snippet label()}
							<!-- "Fee" is the heading above; repeating it in the row would say it twice. -->
							{$i18n.fee.text.estimated}
						{/snippet}
					</EthFeeDisplay>
				</div>
			</SendData>
		{:else}
			<!-- What the transaction calls is the one thing the review can still state about calldata
			     it could not decode, and it is what lets the user look the call up for themselves. A
			     batch names its own wrapper and nothing else, so the calls inside it are listed too. -->
			<EthWalletConnectCallMethods {data} />

			<WalletConnectData {data} label={$i18n.wallet_connect.text.hex_data} />
		{/if}
	</Tabs>

	{#snippet toolbar()}
		<WalletConnectActions
			approveDisabled={approveDisabled ||
				unlistedErc20 ||
				(refused && !(uncheckedSigningOffered && uncheckedSigningAcknowledged))}
			{onApprove}
			{onReject}
		/>
	{/snippet}
</ContentWithToolbar>
