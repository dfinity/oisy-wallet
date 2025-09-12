<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { slide } from 'svelte/transition';
	import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import { send as executeSend } from '$eth/services/send.services';
	import {
		ETH_FEE_CONTEXT_KEY,
		type EthFeeContext as FeeContextType,
		initEthFeeContext,
		initEthFeeStore
	} from '$eth/stores/eth-fee.store';
	import type { EthereumNetwork } from '$eth/types/network';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
	import CkEthLoader from '$icp-eth/components/core/CkEthLoader.svelte';
	import { assertCkEthMinterInfoLoaded } from '$icp-eth/services/cketh.services';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		AI_ASSISTANT_REVIEW_SEND_TOOL_CONFIRMATION,
		AI_ASSISTANT_SEND_TOKEN_SOURCE,
		TRACK_COUNT_ETH_SEND_ERROR,
		TRACK_COUNT_ETH_SEND_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { ZERO } from '$lib/constants/app.constants';
	import {
		AI_ASSISTANT_SEND_TOKENS_BUTTON,
		AI_ASSISTANT_SEND_TOKENS_SUCCESS_MESSAGE
	} from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Address } from '$lib/types/address';
	import type { Token, TokenId } from '$lib/types/token';
	import { isEthAddress } from '$lib/utils/account.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		nativeEthereumToken: Token;
		amount: number;
		destination: Address;
		sourceNetwork: EthereumNetwork;
		sendCompleted: boolean;
		sendEnabled: boolean;
	}

	let {
		amount,
		destination,
		nativeEthereumToken,
		sourceNetwork,
		sendCompleted = $bindable(),
		sendEnabled
	}: Props = $props();

	const {
		sendToken,
		sendTokenId,
		sendTokenDecimals,
		sendBalance,
		sendTokenNetworkId,
		sendTokenSymbol
	} = getContext<SendContext>(SEND_CONTEXT_KEY);

	const feeStore = initEthFeeStore();

	const feeSymbolStore = writable<string | undefined>(undefined);
	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	const feeDecimalsStore = writable<number | undefined>(undefined);
	const feeExchangeRateStore = writable<number | undefined>(undefined);

	$effect(() => {
		feeSymbolStore.set(nativeEthereumToken.symbol);
		feeTokenIdStore.set(nativeEthereumToken.id);
		feeDecimalsStore.set(nativeEthereumToken.decimals);
		feeExchangeRateStore.set($exchanges?.[nativeEthereumToken.id]?.usd);
	});

	const { minGasFee, maxGasFee } = setContext<FeeContextType>(
		ETH_FEE_CONTEXT_KEY,
		initEthFeeContext({
			feeStore,
			feeSymbolStore,
			feeTokenIdStore,
			feeDecimalsStore,
			feeExchangeRateStore
		})
	);

	let loading = $state(false);

	let parsedAmount = $derived(
		parseToken({
			value: `${amount}`,
			unitName: $sendTokenDecimals
		})
	);

	let insufficientFundsErrorMessage = $derived.by(() => {
		// We should align the $sendBalance and userAmount to avoid issues caused by comparing formatted and unformatted BN
		const parsedSendBalance = nonNullish($sendBalance)
			? parseToken({
					value: formatToken({
						value: $sendBalance,
						unitName: $sendTokenDecimals,
						displayDecimals: $sendTokenDecimals
					}),
					unitName: $sendTokenDecimals
				})
			: ZERO;

		// If ETH, the balance should cover the user entered amount plus the min gas fee
		if (isSupportedEthTokenId($sendTokenId) || isSupportedEvmNativeTokenId($sendTokenId)) {
			const total = parsedAmount + ($minGasFee ?? ZERO);
			if (total > parsedSendBalance) {
				return $i18n.send.assertion.insufficient_funds_for_gas;
			}
			return;
		}

		// If ERC20, the balance of the token - e.g. 20 DAI - should cover the amount entered by the user
		if (parsedAmount > parsedSendBalance) {
			return $i18n.send.assertion.insufficient_funds_for_amount;
		}

		// Finally, if ERC20, the ETH balance should be less or greater than the max gas fee
		const ethBalance = $balancesStore?.[nativeEthereumToken.id]?.data ?? ZERO;
		if (nonNullish($maxGasFee) && ethBalance < $maxGasFee) {
			return $i18n.send.assertion.insufficient_ethereum_funds_to_cover_the_fees;
		}
	});

	let invalidDestination = $derived(isNullishOrEmpty(destination) || !isEthAddress(destination));

	let invalid = $derived(
		!sendEnabled ||
			invalidDestination ||
			notEmptyString(insufficientFundsErrorMessage) ||
			isNullish(amount) ||
			isNullish($ckEthMinterInfoStore?.[nativeEthereumToken.id])
	);

	const send = async () => {
		const sharedTrackingEventMetadata = {
			token: $sendTokenSymbol,
			network: `${$sendTokenNetworkId.description}`
		};

		trackEvent({
			name: AI_ASSISTANT_REVIEW_SEND_TOOL_CONFIRMATION,
			metadata: sharedTrackingEventMetadata
		});

		const sendTrackingEventMetadata = {
			...sharedTrackingEventMetadata,
			source: AI_ASSISTANT_SEND_TOKEN_SOURCE
		};

		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (isNullishOrEmpty(destination)) {
			toastsError({
				msg: { text: $i18n.send.assertion.destination_address_invalid }
			});
			return;
		}

		if (invalidAmount(amount) || isNullish(amount)) {
			toastsError({
				msg: { text: $i18n.send.assertion.amount_invalid }
			});
			return;
		}

		if (isNullish($feeStore)) {
			toastsError({
				msg: { text: $i18n.send.assertion.gas_fees_not_defined }
			});
			return;
		}

		const { valid } = assertCkEthMinterInfoLoaded({
			minterInfo: $ckEthMinterInfoStore?.[nativeEthereumToken.id]
		});
		if (!valid) {
			return;
		}

		// https://github.com/ethers-io/ethers.js/discussions/2439#discussioncomment-1857403
		const { maxFeePerGas, maxPriorityFeePerGas, gas } = $feeStore;

		// https://docs.ethers.org/v5/api/providers/provider/#Provider-getFeeData
		// exceeds block gas limit
		if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
			toastsError({
				msg: { text: $i18n.send.assertion.max_gas_fee_per_gas_undefined }
			});
			return;
		}

		// Unexpected errors
		if (isNullish($ethAddress)) {
			toastsError({
				msg: { text: $i18n.send.assertion.address_unknown }
			});
			return;
		}

		try {
			loading = true;

			await executeSend({
				from: $ethAddress,
				to: isErc20Icp($sendToken) ? destination : mapAddressStartsWith0x(destination),
				token: $sendToken,
				amount: parsedAmount,
				maxFeePerGas,
				maxPriorityFeePerGas,
				gas,
				sourceNetwork,
				identity: $authIdentity,
				minterInfo: $ckEthMinterInfoStore?.[nativeEthereumToken.id]
			});

			trackEvent({
				name: TRACK_COUNT_ETH_SEND_SUCCESS,
				metadata: sendTrackingEventMetadata
			});

			sendCompleted = true;
			loading = false;
		} catch (err: unknown) {
			sendCompleted = false;
			loading = false;

			trackEvent({
				name: TRACK_COUNT_ETH_SEND_ERROR,
				metadata: sendTrackingEventMetadata
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});
		}
	};
</script>

<CkEthLoader isSendFlow={true} nativeTokenId={nativeEthereumToken.id}>
	<div class="mb-8 mt-2">
		<EthFeeContext
			{amount}
			{destination}
			{nativeEthereumToken}
			observe={!loading}
			sendToken={$sendToken}
			sendTokenId={$sendTokenId}
			{sourceNetwork}
		>
			<EthFeeDisplay>
				{#snippet label()}
					<Html text={$i18n.fee.text.fee} />
				{/snippet}
			</EthFeeDisplay>
		</EthFeeContext>
	</div>

	{#if !sendCompleted}
		{#if notEmptyString(insufficientFundsErrorMessage) || invalidDestination}
			<p class="mb-2 text-center text-sm text-error-primary" transition:slide={SLIDE_DURATION}>
				{notEmptyString(insufficientFundsErrorMessage)
					? insufficientFundsErrorMessage
					: $i18n.send.assertion.invalid_destination_address}
			</p>
		{/if}

		<Button
			disabled={invalid}
			fullWidth
			{loading}
			onclick={send}
			paddingSmall
			testId={AI_ASSISTANT_SEND_TOKENS_BUTTON}
		>
			{$i18n.send.text.send}
		</Button>
	{:else}
		<p
			class="text-center text-sm text-success-primary"
			data-tid={AI_ASSISTANT_SEND_TOKENS_SUCCESS_MESSAGE}
		>
			{$i18n.ai_assistant.text.send_token_succeeded}
		</p>
	{/if}
</CkEthLoader>
