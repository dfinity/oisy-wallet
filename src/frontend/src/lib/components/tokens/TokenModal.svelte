<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import type { Snippet } from 'svelte';
	import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
	import { isTokenErc20UserToken } from '$eth/utils/erc20.utils';
	import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
	import { isTokenIcrc } from '$icp/utils/icrc.utils';
	import { toUserToken } from '$icp-eth/services/user-token.services';
	import { removeCustomToken, removeUserToken } from '$lib/api/backend.api';
	import { deleteIdbEthToken, deleteIdbIcToken, deleteIdbSolToken } from '$lib/api/idb-tokens.api';
	import TokenModalContent from '$lib/components/tokens/TokenModalContent.svelte';
	import TokenModalDeleteConfirmation from '$lib/components/tokens/TokenModalDeleteConfirmation.svelte';
	import BottomSheetConfirmationPopup from '$lib/components/ui/BottomSheetConfirmationPopup.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { TRACK_DELETE_TOKEN_SUCCESS } from '$lib/constants/analytics.contants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { TokenModalSteps } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import type { OptionToken, Token } from '$lib/types/token';
	import { toCustomToken } from '$lib/utils/custom-token.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { back, gotoReplaceRoot } from '$lib/utils/nav.utils';
	import { isNetworkIdSOLDevnet } from '$lib/utils/network.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';
	import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	interface BaseTokenModalProps {
		token: OptionToken;
		children?: Snippet;
		isDeletable?: boolean;
		fromRoute?: NavigationTarget;
	}

	let { children, token, isDeletable = false, fromRoute }: BaseTokenModalProps = $props();

	let loading = $state(false);
	let showBottomSheetDeleteConfirmation = $state(false);

	let modal: WizardModal | undefined = $state();
	const close = () => modalStore.close();

	const steps: WizardSteps = [
		{
			name: TokenModalSteps.CONTENT,
			title: $i18n.tokens.details.title
		},
		{
			name: TokenModalSteps.DELETE_CONFIRMATION,
			title: $i18n.tokens.text.delete_token
		}
	];
	let currentStep: WizardStep | undefined = $state();
	let currentStepName = $derived(currentStep?.name as TokenModalSteps | undefined);

	const gotoStep = (stepName: TokenModalSteps) => {
		if (nonNullish(modal)) {
			goToWizardStep({
				modal,
				steps,
				stepName
			});
		}
	};

	const handleCloseAndNavigate = async (fromRoute: NavigationTarget | undefined) => {
		close();

		nonNullish(fromRoute) ? await back({ pop: nonNullish(fromRoute) }) : await gotoReplaceRoot();
	};

	const onTokenDeleteSuccess = async (deletedToken: Token) => {
		loading = false;

		await handleCloseAndNavigate(fromRoute);

		const address: string | undefined =
			'address' in deletedToken ? (deletedToken.address as string) : undefined;
		trackEvent({
			name: TRACK_DELETE_TOKEN_SUCCESS,
			metadata: {
				tokenId: `${deletedToken.id.description}`,
				tokenSymbol: deletedToken.symbol,
				...(nonNullish(address) && { address: `${address}` }),
				networkId: `${deletedToken.network.id.description}`
			}
		});

		toastsShow({
			text: replacePlaceholders(
				replaceOisyPlaceholders($i18n.tokens.details.deletion_confirmation),
				{
					$token: getTokenDisplaySymbol(deletedToken)
				}
			),
			level: 'success',
			duration: 2000
		});
	};

	const onTokenDelete = async (tokenToDelete: OptionToken) => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (isNullish(tokenToDelete)) {
			return;
		}

		try {
			// TODO: update this function to handle ICRC/SPL when BE supports removing custom tokens
			if (isTokenErc20UserToken(tokenToDelete)) {
				loading = true;

				const userToken = toUserToken(tokenToDelete);

				await removeUserToken({
					chain_id: userToken.chain_id,
					contract_address: userToken.contract_address,
					identity: $authIdentity
				});

				erc20UserTokensStore.reset(tokenToDelete.id);
				await deleteIdbEthToken({ identity: $authIdentity, token: userToken });

				await onTokenDeleteSuccess(tokenToDelete);
			} else if (isTokenIcrc(tokenToDelete)) {
				loading = true;

				const customToken = toCustomToken({
					...tokenToDelete,
					enabled: true,
					networkKey: 'Icrc'
				});

				await removeCustomToken({
					identity: $authIdentity,
					token: customToken
				});

				icrcCustomTokensStore.reset(tokenToDelete.ledgerCanisterId);
				await deleteIdbIcToken({ identity: $authIdentity, token: customToken });

				await onTokenDeleteSuccess(tokenToDelete);
			} else if (isTokenSpl(tokenToDelete)) {
				loading = true;

				const customToken = toCustomToken({
					...tokenToDelete,
					enabled: true,
					networkKey: isNetworkIdSOLDevnet(tokenToDelete.network.id) ? 'SplDevnet' : 'SplMainnet'
				});

				await removeCustomToken({
					identity: $authIdentity,
					token: customToken
				});

				splCustomTokensStore.reset(tokenToDelete.id);
				await deleteIdbSolToken({ identity: $authIdentity, token: customToken });

				await onTokenDeleteSuccess(tokenToDelete);
			}
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected_error_on_token_delete },
				err
			});

			gotoStep(TokenModalSteps.CONTENT);
			showBottomSheetDeleteConfirmation = false;
			loading = false;
		}
	};
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	disablePointerEvents={loading}
	on:nnsClose={close}
>
	<svelte:fragment slot="title">{currentStep?.title}</svelte:fragment>

	{#if currentStepName === TokenModalSteps.CONTENT}
		<Responsive up="md">
			<TokenModalContent
				{token}
				{...isDeletable && { onDeleteClick: () => gotoStep(TokenModalSteps.DELETE_CONFIRMATION) }}
			>
				{@render children?.()}
			</TokenModalContent>
		</Responsive>
		<Responsive down="sm">
			<TokenModalContent
				{token}
				{...isDeletable && { onDeleteClick: () => (showBottomSheetDeleteConfirmation = true) }}
			>
				{@render children?.()}
			</TokenModalContent>
		</Responsive>
	{:else if currentStepName === TokenModalSteps.DELETE_CONFIRMATION}
		<TokenModalDeleteConfirmation
			{token}
			{loading}
			onCancel={() => gotoStep(TokenModalSteps.CONTENT)}
			onConfirm={() => onTokenDelete(token)}
		/>
	{/if}
</WizardModal>

{#if currentStep?.name === TokenModalSteps.CONTENT && showBottomSheetDeleteConfirmation}
	<BottomSheetConfirmationPopup
		onCancel={() => (showBottomSheetDeleteConfirmation = false)}
		disabled={loading}
	>
		{#snippet title()}
			{$i18n.tokens.text.delete_token}
		{/snippet}

		{#snippet content()}
			<TokenModalDeleteConfirmation
				{token}
				{loading}
				onCancel={() => (showBottomSheetDeleteConfirmation = false)}
				onConfirm={() => onTokenDelete(token)}
			/>
		{/snippet}
	</BottomSheetConfirmationPopup>
{/if}
