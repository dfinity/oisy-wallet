<script lang="ts">
	import { assertNonNullish, isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { isSolanaError, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED } from '@solana/kit';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { slide } from 'svelte/transition';
	import {
		SOLANA_DEVNET_TOKEN,
		SOLANA_LOCAL_TOKEN,
		SOLANA_TOKEN
	} from '$env/tokens/tokens.sol.env';
	import SendFeeInfo from '$lib/components/send/SendFeeInfo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		AI_ASSISTANT_REVIEW_SEND_TOOL_CONFIRMATION,
		AI_ASSISTANT_SEND_TOKEN_SOURCE,
		TRACK_COUNT_SOL_SEND_ERROR,
		TRACK_COUNT_SOL_SEND_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { ZERO } from '$lib/constants/app.constants';
	import {
		AI_ASSISTANT_SEND_TOKENS_BUTTON,
		AI_ASSISTANT_SEND_TOKENS_SUCCESS_MESSAGE
	} from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Address } from '$lib/types/address';
	import type { TokenId } from '$lib/types/token';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import {
		isNetworkIdSolana,
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal
	} from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import SolFeeContext from '$sol/components/fee/SolFeeContext.svelte';
	import SolFeeDisplay from '$sol/components/fee/SolFeeDisplay.svelte';
	import { sendSol } from '$sol/services/sol-send.services';
	import {
		SOL_FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeContext,
		initFeeStore
	} from '$sol/stores/sol-fee.store';
	import { invalidSolAddress } from '$sol/utils/sol-address.utils';

	interface Props {
		amount: number;
		destination: Address;
		sendCompleted: boolean;
		sendEnabled: boolean;
	}

	let { amount, destination, sendCompleted = $bindable(), sendEnabled }: Props = $props();

	const {
		sendToken,
		sendTokenNetworkId,
		sendTokenDecimals,
		sendTokenSymbol,
		sendBalance,
		sendTokenStandard
	} = getContext<SendContext>(SEND_CONTEXT_KEY);

	let [source, solanaNativeToken] = $derived(
		isNetworkIdSOLDevnet($sendTokenNetworkId)
			? [$solAddressDevnet, SOLANA_DEVNET_TOKEN]
			: isNetworkIdSOLLocal($sendTokenNetworkId)
				? [$solAddressLocal, SOLANA_LOCAL_TOKEN]
				: [$solAddressMainnet, SOLANA_TOKEN]
	);

	const feeStore = initFeeStore();
	const prioritizationFeeStore = initFeeStore();
	const ataFeeStore = initFeeStore();

	const feeSymbolStore = writable<string | undefined>(undefined);
	$effect(() => {
		feeSymbolStore.set(solanaNativeToken.symbol);
	});

	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	$effect(() => {
		feeTokenIdStore.set(solanaNativeToken.id);
	});

	const feeDecimalsStore = writable<number | undefined>(undefined);
	$effect(() => {
		feeDecimalsStore.set(solanaNativeToken.decimals);
	});

	setContext<FeeContextType>(
		SOL_FEE_CONTEXT_KEY,
		initFeeContext({
			feeStore,
			prioritizationFeeStore,
			ataFeeStore,
			feeSymbolStore,
			feeDecimalsStore,
			feeTokenIdStore
		})
	);

	let loading = $state(false);

	let parsedAmount = $derived(
		parseToken({
			value: `${amount}`,
			unitName: $sendTokenDecimals
		})
	);

	let amountErrorMessage = $derived.by(() => {
		if (invalidAmount(amount) || parsedAmount === ZERO) {
			return $i18n.send.assertion.amount_invalid;
		}
		if (nonNullish($sendBalance) && $sendTokenStandard === 'solana') {
			const total = parsedAmount + ($feeStore ?? ZERO);
			if (total > $sendBalance) {
				return $i18n.send.assertion.insufficient_funds_for_gas;
			}
			return;
		}
		if (parsedAmount > ($sendBalance ?? ZERO)) {
			return $i18n.send.assertion.insufficient_funds;
		}
		const solBalance = $balancesStore?.[solanaNativeToken.id]?.data ?? ZERO;
		if (nonNullish($feeStore) && solBalance < $feeStore) {
			return $i18n.send.assertion.insufficient_solana_funds_to_cover_the_fees;
		}
	});

	let invalidDestination = $derived(
		isNullishOrEmpty(destination) || invalidSolAddress(destination)
	);

	let invalid = $derived(
		!sendEnabled || invalidDestination || notEmptyString(amountErrorMessage) || isNullish(amount)
	);

	const send = async () => {
		const sharedTrackingEventMetadata = {
			token: $sendTokenSymbol
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

		if (isNullish($sendTokenNetworkId) || !isNetworkIdSolana($sendTokenNetworkId)) {
			toastsError({
				msg: { text: $i18n.send.error.no_solana_network_id }
			});
			return;
		}

		// This should not happen, it is just a safety check for types
		assertNonNullish(source);

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

		if (isNullish($sendToken)) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected_undefined }
			});
			return;
		}

		try {
			loading = true;

			await sendSol({
				identity: $authIdentity,
				token: $sendToken,
				amount: parsedAmount,
				prioritizationFee: $prioritizationFeeStore ?? ZERO,
				destination,
				source
			});

			trackEvent({
				name: TRACK_COUNT_SOL_SEND_SUCCESS,
				metadata: sendTrackingEventMetadata
			});

			sendCompleted = true;
			loading = false;
		} catch (err: unknown) {
			sendCompleted = false;
			loading = false;

			trackEvent({
				name: TRACK_COUNT_SOL_SEND_ERROR,
				metadata: sendTrackingEventMetadata
			});

			const errorMsg = isSolanaError(err, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED)
				? $i18n.send.error.solana_transaction_expired
				: $i18n.send.error.unexpected;

			toastsError({
				msg: { text: errorMsg },
				err
			});
		}
	};
</script>

<div class="mb-8 mt-2">
	<SolFeeContext {destination} observe={!loading}>
		<SolFeeDisplay />

		<SendFeeInfo
			decimals={$feeDecimalsStore}
			feeSymbol={$feeSymbolStore}
			feeTokenId={$feeTokenIdStore}
		/>
	</SolFeeContext>
</div>

{#if !sendCompleted}
	{#if notEmptyString(amountErrorMessage) || invalidDestination}
		<p class="mb-2 text-center text-sm text-error-primary" transition:slide={SLIDE_DURATION}>
			{notEmptyString(amountErrorMessage)
				? amountErrorMessage
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
