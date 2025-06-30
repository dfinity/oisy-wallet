<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
	import SwapProviderListModal from '$lib/components/swap/SwapProviderListModal.svelte';
	import SwapTokensList from '$lib/components/swap/SwapTokensList.svelte';
	import SwapWizard from '$lib/components/swap/SwapWizard.svelte';
	import { swapWizardSteps } from '$lib/config/swap.config';
	import { SWAP_DEFAULT_SLIPPAGE_VALUE } from '$lib/constants/swap.constants';
	import { SWAP_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { swappableTokens } from '$lib/derived/swap.derived';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext, initSwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapMappedResult, SwapSelectTokenType } from '$lib/types/swap';
	import { closeModal } from '$lib/utils/modal.utils';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { formatUnits, parseUnits } from 'ethers/utils';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { constructSimpleSDK } from '@velora-dex/sdk';
	import { Signature, TypedDataEncoder } from 'ethers';
	import { signPrehash } from '$lib/api/signer.api';
	import { createPermit2WithApproval } from '$eth/services/erc20-permit2.services';
	import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import type { Token } from '$lib/types/token';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import { evmNativeToken } from '$evm/derived/token.derived';

	const { setSourceToken, setDestinationToken } = setContext<SwapContext>(
		SWAP_CONTEXT_KEY,
		initSwapContext({
			sourceToken: $swappableTokens.sourceToken,
			destinationToken: $swappableTokens.destinationToken
		})
	);

	setContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		initModalTokensListContext({
			tokens: $enabledTokens,
			filterZeroBalance: true,
			filterNetwork: $selectedNetwork
		})
	);

	let fallbackEvmToken = $derived(
		$enabledEvmTokens.find(({ network: { id: networkId } }) => USDC_TOKEN.network.id === networkId)
	);

	let evmNativeEthereumToken = $derived(fallbackEvmToken);

	const amount = '1000000';
	const amountApprove = '2000000';
	const srcToken = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
	const destToken = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
	const srcDecimals = 6;
	const destDecimals = 6;

	const swap = async () => {
		if (nonNullish($ethAddress) && nonNullish($authIdentity)) {
			const deltaSDK = constructSimpleSDK({ chainId: 8453, fetch: window.fetch });

			const deltaPrice = await deltaSDK.delta.getDeltaPrice({
				srcToken,
				destToken,
				amount,
				userAddress: $ethAddress,
				srcDecimals,
				destDecimals,
				destChainId: 137
			});

			const slippagePercent = 0.5;
			const decimalDestAmount = Number(formatUnits(deltaPrice.destAmount, destDecimals));
			const adjustedDecimalAmount = decimalDestAmount * (1 - slippagePercent / 100);
			const destAmountAfterSlippage = parseUnits(
				adjustedDecimalAmount.toFixed(destDecimals),
				destDecimals
			).toString();

			const deltaContract = await deltaSDK.delta.getDeltaContract();
			const chainId = 8453;
			const now = Math.floor(Date.now() / 1000);
			const sigDeadline = now + 30 * 60;
			const nonce = 0n;

			console.log('in swapModal');

			if (isNullish(evmNativeEthereumToken)) {
				console.log('Empty evmNativeEthereumToken', evmNativeEthereumToken);
				return;
			}

			console.log({
				$ckEthMinterInfoStore,
				ckinfoStore: $ckEthMinterInfoStore?.[evmNativeEthereumToken.id],
				evmNativeEthereumTokenId: evmNativeEthereumToken.id
			});

			const permit2 = await createPermit2WithApproval({
				token: USDC_TOKEN,
				from: $ethAddress,
				identity: $authIdentity,
				spender: deltaContract!,
				amount,
				decimals: USDC_TOKEN.decimals,
				chainId,
				deadline: sigDeadline,
				nonce,
				sourceNetwork: USDC_TOKEN.network,
				minterInfo: $ckEthMinterInfoStore?.[evmNativeEthereumToken.id]
			});

			const signableOrderData = await deltaSDK.delta.buildDeltaOrder({
				deltaPrice,
				owner: $ethAddress,
				srcToken: srcToken,
				destToken: destToken,
				srcAmount: amount,
				destAmount: destAmountAfterSlippage,
				deadline: sigDeadline,
				destChainId: 137,
				// permit: permit2
			});

			const { domain: orderDomain, types: orderTypes, data } = signableOrderData;
			const eip712OrderHash = TypedDataEncoder.hash(orderDomain, orderTypes, data);
			const orderSignature = await signPrehash({
				hash: eip712OrderHash,
				identity: $authIdentity
			});
			const compactOrderSig = Signature.from(orderSignature).compactSerialized;

			// Submit to Velora
			try {
				const result = await deltaSDK.delta.postDeltaOrder({
					order: signableOrderData.data,
					signature: compactOrderSig
				});

				console.log('✅ SUCCESS! Order submitted to Velora:', result);
				return result;
			} catch (e: any) {
				console.error('❌ FAILED! Detailed analysis:', e);

				if (e?.response?.text) {
					const errorText = await e.response.text();
					console.error('❌ Velora error response:', errorText);
				} else {
					console.error('❌ Raw error:', e);
				}
				throw e;
			}
		}
	};

	swap();

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let modal = $state<WizardModal>();

	let steps = $derived<WizardSteps>(swapWizardSteps({ i18n: $i18n }));

	let swapAmount = $state<OptionAmount>();
	let receiveAmount = $state<number | undefined>();
	let slippageValue = $state<OptionAmount>(SWAP_DEFAULT_SLIPPAGE_VALUE);
	let swapProgressStep = $state(ProgressStepsSwap.INITIALIZATION);
	let currentStep = $state<WizardStep | undefined>();
	let selectTokenType = $state<SwapSelectTokenType | undefined>();
	let showSelectProviderModal = $state<boolean>(false);

	const showTokensList = ({ detail: type }: CustomEvent<SwapSelectTokenType>) => {
		swapAmountsStore.reset();
		selectTokenType = type;
	};

	const closeTokenList = () => {
		selectTokenType = undefined;
	};

	const selectToken = ({ detail: token }: CustomEvent<IcTokenToggleable>) => {
		if (selectTokenType === 'source') {
			setSourceToken(token);
		} else if (selectTokenType === 'destination') {
			setDestinationToken(token);
		}
		closeTokenList();
	};

	let title = $derived(
		selectTokenType === 'source'
			? $i18n.swap.text.select_source_token
			: selectTokenType === 'destination'
				? $i18n.swap.text.select_destination_token
				: showSelectProviderModal
					? $i18n.swap.text.select_swap_provider
					: (currentStep?.title ?? '')
	);

	const dispatch = createEventDispatcher();

	const close = () =>
		closeModal(() => {
			currentStep = undefined;
			selectTokenType = undefined;
			showSelectProviderModal = false;
			dispatch('nnsClose');
		});

	const openSelectProviderModal = () => {
		showSelectProviderModal = true;
	};
	const closeSelectProviderModal = () => {
		showSelectProviderModal = false;
	};
	const selectProvider = ({ detail }: CustomEvent<SwapMappedResult>) => {
		swapAmountsStore.setSelectedProvider(detail);
		closeSelectProviderModal();
	};

	// TODO: Migrate to Svelte 5, remove legacy slot usage and use render composition instead
</script>

<WizardModal
	{steps}
	testId={SWAP_TOKENS_MODAL}
	bind:this={modal}
	bind:currentStep
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === WizardStepsSwap.SWAPPING || showSelectProviderModal}
>
	<svelte:fragment slot="title">{title}</svelte:fragment>

	{#if nonNullish(selectTokenType)}
		<SwapTokensList on:icSelectToken={selectToken} on:icCloseTokensList={closeTokenList} />
	{:else if showSelectProviderModal}
		<SwapProviderListModal
			on:icSelectProvider={selectProvider}
			on:icCloseProviderList={closeSelectProviderModal}
		/>
	{:else}
		<SwapWizard
			{currentStep}
			bind:swapAmount
			bind:receiveAmount
			bind:slippageValue
			bind:swapProgressStep
			on:icBack={modal.back}
			on:icNext={modal.next}
			on:icClose={close}
			on:icShowTokensList={showTokensList}
			on:icShowProviderList={openSelectProviderModal}
		/>
	{/if}
</WizardModal>
