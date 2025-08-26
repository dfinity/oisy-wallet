<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import type { Snippet } from 'svelte';
	import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
	import { isTokenErc20UserToken } from '$eth/utils/erc20.utils';
	import IcAddTokenForm from '$icp/components/tokens/IcAddTokenForm.svelte';
	import { assertIndexLedgerId } from '$icp/services/ic-add-custom-tokens.service';
	import { loadCustomTokens } from '$icp/services/icrc.services';
	import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
	import { icTokenIcrcCustomToken, isTokenIcrc } from '$icp/utils/icrc.utils';
	import { toUserToken } from '$icp-eth/services/user-token.services';
	import { removeCustomToken, removeUserToken, setCustomToken } from '$lib/api/backend.api';
	import {
		deleteIdbEthTokenDeprecated,
		deleteIdbIcToken,
		deleteIdbSolToken
	} from '$lib/api/idb-tokens.api';
	import AddTokenByNetworkDropdown from '$lib/components/manage/AddTokenByNetworkDropdown.svelte';
	import TokenModalContent from '$lib/components/tokens/TokenModalContent.svelte';
	import TokenModalDeleteConfirmation from '$lib/components/tokens/TokenModalDeleteConfirmation.svelte';
	import BottomSheetConfirmationPopup from '$lib/components/ui/BottomSheetConfirmationPopup.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import {
		TRACK_DELETE_TOKEN_SUCCESS,
		TRACK_EDIT_TOKEN_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { addTokenSteps } from '$lib/constants/steps.constants';
	import { TOKEN_MODAL_SAVE_BUTTON } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
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
		isEditable?: boolean;
		fromRoute?: NavigationTarget;
	}

	let {
		children,
		token,
		isDeletable = false,
		isEditable = false,
		fromRoute
	}: BaseTokenModalProps = $props();

	let loading = $derived(false);
	let showBottomSheetDeleteConfirmation = $state(false);
	let icrcTokenIndexCanisterId = $derived(
		nonNullish(token) && isTokenIcrc(token) ? (token.indexCanisterId ?? '') : ''
	);

	let modal: WizardModal<TokenModalSteps> | undefined = $state();
	const close = () => modalStore.close();

	const steps: WizardSteps<TokenModalSteps> = [
		{
			name: TokenModalSteps.CONTENT,
			title: $i18n.tokens.details.title
		},
		{
			name: TokenModalSteps.DELETE_CONFIRMATION,
			title: $i18n.tokens.text.delete_token
		},
		{
			name: TokenModalSteps.EDIT,
			title: $i18n.tokens.text.edit_token
		},
		{
			name: TokenModalSteps.EDIT_PROGRESS,
			title: $i18n.tokens.import.text.updating
		}
	];
	let currentStep: WizardStep<TokenModalSteps> | undefined = $state();
	let currentStepName = $derived(currentStep?.name);
	let saveProgressStep: ProgressStepsAddToken = $state(ProgressStepsAddToken.INITIALIZATION);

	const progress = (step: ProgressStepsAddToken) => (saveProgressStep = step);

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
				await deleteIdbEthTokenDeprecated({ identity: $authIdentity, token: userToken });

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

	const onTokenEdit = async (tokenToEdit: OptionToken) => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (isNullish(tokenToEdit)) {
			return;
		}

		try {
			if (icTokenIcrcCustomToken(tokenToEdit)) {
				loading = true;
				gotoStep(TokenModalSteps.EDIT_PROGRESS);
				progress(ProgressStepsAddToken.SAVE);

				const { valid } = notEmptyString(icrcTokenIndexCanisterId)
					? await assertIndexLedgerId({
							identity: $authIdentity,
							ledgerCanisterId: tokenToEdit.ledgerCanisterId,
							indexCanisterId: icrcTokenIndexCanisterId
						})
					: { valid: true };

				if (!valid) {
					loading = false;
					icrcTokenIndexCanisterId = tokenToEdit.indexCanisterId ?? '';
					progress(ProgressStepsAddToken.INITIALIZATION);
					gotoStep(TokenModalSteps.CONTENT);
					return;
				}

				await setCustomToken({
					token: toCustomToken({
						...(notEmptyString(icrcTokenIndexCanisterId) && {
							indexCanisterId: icrcTokenIndexCanisterId
						}),
						ledgerCanisterId: tokenToEdit.ledgerCanisterId,
						version: tokenToEdit.version,
						enabled: true,
						networkKey: 'Icrc'
					}),
					identity: $authIdentity
				});

				progress(ProgressStepsAddToken.UPDATE_UI);
				// Similar as on token "save", we reload all custom tokens for simplicity reason.
				await loadCustomTokens({
					identity: $authIdentity,
					onSuccess: () => {
						if (!loading) {
							return;
						}

						loading = false;
						progress(ProgressStepsAddToken.DONE);
						close();

						// the token needs to be reset to restart the worker with indexCanisterId
						icrcCustomTokensStore.reset(tokenToEdit.ledgerCanisterId);

						trackEvent({
							name: TRACK_EDIT_TOKEN_SUCCESS,
							metadata: {
								tokenId: `${tokenToEdit.id.description}`,
								tokenSymbol: tokenToEdit.symbol,
								ledgerCanisterId: tokenToEdit.ledgerCanisterId,
								networkId: `${tokenToEdit.network.id.description}`
							}
						});

						toastsShow({
							text: replacePlaceholders($i18n.tokens.details.update_confirmation, {
								$token: getTokenDisplaySymbol(tokenToEdit)
							}),
							level: 'success',
							duration: 2000
						});
					}
				});
			}
		} catch (err) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected_error_on_token_update },
				err
			});

			loading = false;
			icrcTokenIndexCanisterId = isTokenIcrc(tokenToEdit)
				? (tokenToEdit.indexCanisterId ?? '')
				: '';
			progress(ProgressStepsAddToken.INITIALIZATION);
			gotoStep(TokenModalSteps.CONTENT);
		}
	};
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={loading || currentStepName === TokenModalSteps.EDIT_PROGRESS}
	onClose={close}
	{steps}
	bind:currentStep
>
	{#snippet title()}{currentStep?.title}{/snippet}

	{#if currentStepName === TokenModalSteps.CONTENT}
		<Responsive up="md">
			<TokenModalContent
				{token}
				{...isDeletable && { onDeleteClick: () => gotoStep(TokenModalSteps.DELETE_CONFIRMATION) }}
				{...isEditable && {
					onEditClick: () => gotoStep(TokenModalSteps.EDIT)
				}}
			>
				{@render children?.()}
			</TokenModalContent>
		</Responsive>
		<Responsive down="sm">
			<TokenModalContent
				{token}
				{...isDeletable && { onDeleteClick: () => (showBottomSheetDeleteConfirmation = true) }}
				{...isEditable && {
					onEditClick: () => gotoStep(TokenModalSteps.EDIT)
				}}
			>
				{@render children?.()}
			</TokenModalContent>
		</Responsive>
	{:else if currentStepName === TokenModalSteps.DELETE_CONFIRMATION}
		<TokenModalDeleteConfirmation
			{loading}
			onCancel={() => gotoStep(TokenModalSteps.CONTENT)}
			onConfirm={() => onTokenDelete(token)}
			{token}
		/>
	{:else if currentStepName === TokenModalSteps.EDIT && nonNullish(token) && isTokenIcrc(token)}
		<ContentWithToolbar>
			<AddTokenByNetworkDropdown
				availableNetworks={[token.network]}
				disabled
				networkName={token.network.name}
			/>

			<IcAddTokenForm
				editMode
				ledgerCanisterId={token.ledgerCanisterId}
				bind:indexCanisterId={icrcTokenIndexCanisterId}
			/>

			{#snippet toolbar()}
				<ButtonGroup>
					<ButtonBack onclick={() => gotoStep(TokenModalSteps.CONTENT)} />

					<Button
						disabled={icrcTokenIndexCanisterId === (token.indexCanisterId ?? '')}
						onclick={() => onTokenEdit(token)}
						testId={TOKEN_MODAL_SAVE_BUTTON}
					>
						{$i18n.core.text.save}
					</Button>
				</ButtonGroup>
			{/snippet}
		</ContentWithToolbar>
	{:else if currentStepName === TokenModalSteps.EDIT_PROGRESS}
		<InProgressWizard progressStep={saveProgressStep} steps={addTokenSteps($i18n)} />
	{/if}
</WizardModal>

{#if currentStepName === TokenModalSteps.CONTENT && showBottomSheetDeleteConfirmation}
	<BottomSheetConfirmationPopup
		disabled={loading}
		onCancel={() => (showBottomSheetDeleteConfirmation = false)}
	>
		{#snippet title()}
			{$i18n.tokens.text.delete_token}
		{/snippet}

		{#snippet content()}
			<TokenModalDeleteConfirmation
				{loading}
				onCancel={() => (showBottomSheetDeleteConfirmation = false)}
				onConfirm={() => onTokenDelete(token)}
				{token}
			/>
		{/snippet}
	</BottomSheetConfirmationPopup>
{/if}
