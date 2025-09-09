<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { type Snippet, createEventDispatcher, getContext } from 'svelte';
	import { run } from 'svelte/legacy';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import EthConvertForm from '$eth/components/convert/EthConvertForm.svelte';
	import EthConvertProgress from '$eth/components/convert/EthConvertProgress.svelte';
	import EthConvertReview from '$eth/components/convert/EthConvertReview.svelte';
	import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { ethereumToken } from '$eth/derived/token.derived';
	import { send as executeSend } from '$eth/services/send.services';
	import { ETH_FEE_CONTEXT_KEY } from '$eth/stores/eth-fee.store';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { ProgressStep } from '$eth/types/send';
	import { isTokenErc20 } from '$eth/utils/erc20.utils';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import {
		ckErc20HelperContractAddress,
		ckEthHelperContractAddress
	} from '$icp-eth/derived/cketh.derived';
	import { assertCkEthMinterInfoLoaded } from '$icp-eth/services/cketh.services';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import {
		TRACK_COUNT_CONVERT_ETH_TO_CKETH_ERROR,
		TRACK_COUNT_CONVERT_ETH_TO_CKETH_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { WizardStepsConvert } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		currentStep: WizardStep | undefined;
		sendAmount: OptionAmount;
		receiveAmount: number | undefined;
		convertProgressStep: string;
		formCancelAction?: 'back' | 'close';
		children?: Snippet;
	}

	let {
		currentStep,
		sendAmount = $bindable(),
		receiveAmount = $bindable(),
		convertProgressStep = $bindable(),
		formCancelAction = 'close',
		children
	}: Props = $props();

	const { sourceToken } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const { feeStore } = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	let destination = $state('');
	run(() => {
		destination = isTokenErc20($sourceToken)
			? ($ckErc20HelperContractAddress ?? '')
			: ($ckEthHelperContractAddress ?? '');
	});

	let sourceNetwork: EthereumNetwork = $derived(
		$selectedEthereumNetwork ?? DEFAULT_ETHEREUM_NETWORK
	);

	const dispatch = createEventDispatcher();

	const convert = async () => {
		if (isNullishOrEmpty(destination)) {
			toastsError({
				msg: { text: $i18n.send.assertion.destination_address_invalid }
			});
			return;
		}

		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (isNullish(sendAmount) || invalidAmount(sendAmount)) {
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
			minterInfo: $ckEthMinterInfoStore?.[$ethereumToken.id],
			network: ICP_NETWORK
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
		if (isNullish($ethAddress) || isNullish($ckEthHelperContractAddress)) {
			toastsError({
				msg: { text: $i18n.send.assertion.address_unknown }
			});
			return;
		}

		dispatch('icNext');

		try {
			await executeSend({
				from: $ethAddress,
				to: isErc20Icp($sourceToken) ? destination : mapAddressStartsWith0x(destination),
				progress: (step: ProgressStep) => (convertProgressStep = step),
				token: $sourceToken,
				amount: parseToken({
					value: `${sendAmount}`,
					unitName: $sourceToken.decimals
				}),
				maxFeePerGas,
				maxPriorityFeePerGas,
				gas,
				sourceNetwork,
				targetNetwork: ICP_NETWORK,
				identity: $authIdentity,
				minterInfo: $ckEthMinterInfoStore?.[$ethereumToken.id]
			});

			trackEvent({
				name: TRACK_COUNT_CONVERT_ETH_TO_CKETH_SUCCESS
			});

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_CONVERT_ETH_TO_CKETH_ERROR
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			dispatch('icBack');
		}
	};

	const close = () => dispatch('icClose');
	const back = () => dispatch('icBack');
</script>

<EthFeeContext
	amount={sendAmount}
	{destination}
	nativeEthereumToken={$ethereumToken}
	observe={currentStep?.name !== WizardStepsConvert.CONVERTING &&
		currentStep?.name !== WizardStepsConvert.REVIEW}
	sendToken={$sourceToken}
	sendTokenId={$sourceToken.id}
	{sourceNetwork}
	targetNetwork={ICP_NETWORK}
>
	{#if currentStep?.name === WizardStepsConvert.CONVERT}
		<EthConvertForm on:icNext on:icClose bind:sendAmount bind:receiveAmount {destination}>
			{#snippet cancel()}
				{#if formCancelAction === 'back'}
					<ButtonBack onclick={back} />
				{:else}
					<ButtonCancel onclick={close} />
				{/if}
			{/snippet}
		</EthConvertForm>
	{:else if currentStep?.name === WizardStepsConvert.REVIEW}
		<EthConvertReview on:icConvert={convert} on:icBack {sendAmount} {receiveAmount}>
			{#snippet cancel()}
				<ButtonBack onclick={back} />
			{/snippet}
		</EthConvertReview>
	{:else if currentStep?.name === WizardStepsConvert.CONVERTING}
		<EthConvertProgress
			{destination}
			nativeEthereumToken={$ethereumToken}
			sourceTokenId={$sourceToken.id}
			bind:convertProgressStep
		/>
	{:else}
		{@render children?.()}
	{/if}
</EthFeeContext>
