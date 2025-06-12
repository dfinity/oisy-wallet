<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
	import { isTokenErc20UserToken } from '$eth/utils/erc20.utils';
	import { toUserToken } from '$icp-eth/services/user-token.services';
	import { removeUserToken } from '$lib/api/backend.api';
	import { deleteIdbEthToken } from '$lib/api/idb-tokens.api';
	import TokenModalContent from '$lib/components/tokens/TokenModalContent.svelte';
	import TokenModalDeleteConfirmation from '$lib/components/tokens/TokenModalDeleteConfirmation.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { TokenModalSteps } from '$lib/enums/wizard-steps';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import type { OptionToken, Token } from '$lib/types/token';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { gotoReplaceRoot } from '$lib/utils/nav.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface BaseTokenModalProps {
		token: OptionToken;
		children?: Snippet;
		isDeletable?: boolean;
	}

	let { children, token, isDeletable = false }: BaseTokenModalProps = $props();

	let loading = $state(false);

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

	const onTokenDeleteSuccess = async (deletedToken: Token) => {
		loading = false;

		close();

		await gotoReplaceRoot();

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
			}
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected_error_on_token_delete },
				err
			});

			gotoStep(TokenModalSteps.CONTENT);
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
		<TokenModalContent
			{token}
			{...isDeletable && { onDeleteClick: () => gotoStep(TokenModalSteps.DELETE_CONFIRMATION) }}
		>
			{@render children?.()}
		</TokenModalContent>
	{:else if currentStepName === TokenModalSteps.DELETE_CONFIRMATION}
		<TokenModalDeleteConfirmation
			{token}
			{loading}
			onCancel={() => gotoStep(TokenModalSteps.CONTENT)}
			onConfirm={() => onTokenDelete(token)}
		/>
	{/if}
</WizardModal>
