<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { agreementsData } from '$env/agreements.env';
	import type { EnvAgreements } from '$env/types/env-agreements';
	import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
	import { updateUserAgreements } from '$lib/api/backend.api';
	import agreementsBanner from '$lib/assets/banner-agreements.svg';
	import AcceptAgreementsCheckbox from '$lib/components/agreements/AcceptAgreementsCheckbox.svelte';
	import IconExternalLink from '$lib/components/icons/IconExternalLink.svelte';
	import LicenseLink from '$lib/components/license-agreement/LicenseLink.svelte';
	import PrivacyPolicyLink from '$lib/components/privacy-policy/PrivacyPolicyLink.svelte';
	import TermsOfUseLink from '$lib/components/terms-of-use/TermsOfUseLink.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import {
		AGREEMENTS_MODAL,
		AGREEMENTS_MODAL_ACCEPT_BUTTON,
		AGREEMENTS_MODAL_CHECKBOX_LICENSE_AGREEMENT,
		AGREEMENTS_MODAL_CHECKBOX_PRIVACY_POLICY,
		AGREEMENTS_MODAL_CHECKBOX_TERMS_OF_USE
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { noAgreementVisionedYet, outdatedAgreements } from '$lib/derived/user-agreements.derived';
	import { userProfileVersion } from '$lib/derived/user-profile.derived';
	import { nullishSignOut, warnSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { UserAgreements } from '$lib/types/user-agreements';
	import { emit } from '$lib/utils/events.utils';

	type AgreementsToAcceptType = {
		[K in keyof EnvAgreements]?: boolean;
	};

	let agreementsToAccept = $state<AgreementsToAcceptType>({});

	let updatingAgreements = $state(true);

	$effect(() => {
		updatingAgreements = true;

		agreementsToAccept = Object.keys($outdatedAgreements).reduce<AgreementsToAcceptType>(
			(acc, agreementType) => ({
				...acc,
				[agreementType as keyof EnvAgreements]: false
			}),
			{}
		);

		updatingAgreements = false;
	});

	const acceptedAllAgreements = $derived(
		Object.values(agreementsToAccept).filter((a) => !a).length === 0
	);

	let disabled = $derived(!acceptedAllAgreements || updatingAgreements);

	const toggleAccept = (type: keyof AgreementsToAcceptType) => {
		agreementsToAccept[type] = !agreementsToAccept[type];
	};

	let savingAgreements = $state(false);

	const onReject = () => {
		// TODO: Add (non-awaited?) services to save the user agreements rejection status

		warnSignOut($i18n.agreements.text.reject_warning);
	};

	const onAccept = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		savingAgreements = true;

		const agreements: UserAgreements = Object.entries(agreementsToAccept).reduce<UserAgreements>(
			(acc, [agreement, accepted]) => {
				if (accepted) {
					return {
						...acc,
						[agreement]: {
							accepted,
							lastAcceptedTimestamp: nowInBigIntNanoSeconds(),
							lastUpdatedTimestamp:
								agreementsData[agreement as keyof EnvAgreements].lastUpdatedTimestamp
						}
					};
				}
				return acc;
			},
			{} as UserAgreements
		);

		try {
			await updateUserAgreements({
				identity: $authIdentity,
				agreements,
				currentUserVersion: $userProfileVersion
			});

			emit({ message: 'oisyRefreshUserProfile' });
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.agreements.error.cannot_update_user_agreements },
				err
			});
		} finally {
			savingAgreements = false;
		}
	};
</script>

<!-- TODO: remove the close button from the modal -->
<Modal testId={AGREEMENTS_MODAL}>
	<h4 slot="title">
		{$noAgreementVisionedYet
			? $i18n.agreements.text.review_title
			: $i18n.agreements.text.review_updated_title}
	</h4>
	<ContentWithToolbar>
		<Img src={agreementsBanner} styleClass="mb-6" />
		<p>
			{$noAgreementVisionedYet
				? $i18n.agreements.text.review_description
				: $i18n.agreements.text.review_updated_description}
		</p>

		<div style="--checkbox-label-order: 1" class="flex flex-col font-bold">
			{#if 'termsOfUse' in agreementsToAccept}
				<AcceptAgreementsCheckbox
					checked={agreementsToAccept['termsOfUse'] ?? false}
					inputId="termsOfUseCheckbox"
					isOutdated={!$noAgreementVisionedYet}
					onChange={() => toggleAccept('termsOfUse')}
					testId={AGREEMENTS_MODAL_CHECKBOX_TERMS_OF_USE}
				>
					{#snippet agreementLink()}
						<TermsOfUseLink noUnderline>
							{#snippet icon()}
								<IconExternalLink size="18" />
							{/snippet}
						</TermsOfUseLink>
					{/snippet}
				</AcceptAgreementsCheckbox>
			{/if}
			{#if 'privacyPolicy' in agreementsToAccept}
				<AcceptAgreementsCheckbox
					checked={agreementsToAccept['privacyPolicy'] ?? false}
					inputId="privacyPolicyCheckbox"
					isOutdated={!$noAgreementVisionedYet}
					onChange={() => toggleAccept('privacyPolicy')}
					testId={AGREEMENTS_MODAL_CHECKBOX_PRIVACY_POLICY}
				>
					{#snippet agreementLink()}
						<PrivacyPolicyLink noUnderline>
							{#snippet icon()}
								<IconExternalLink size="18" />
							{/snippet}
						</PrivacyPolicyLink>
					{/snippet}
				</AcceptAgreementsCheckbox>
			{/if}
			{#if 'licenseAgreement' in agreementsToAccept}
				<AcceptAgreementsCheckbox
					checked={agreementsToAccept['licenseAgreement'] ?? false}
					inputId="licenseAgreementCheckbox"
					isOutdated={!$noAgreementVisionedYet}
					onChange={() => toggleAccept('licenseAgreement')}
					testId={AGREEMENTS_MODAL_CHECKBOX_LICENSE_AGREEMENT}
				>
					{#snippet agreementLink()}
						<LicenseLink noUnderline>
							{#snippet icon()}
								<IconExternalLink size="18" />
							{/snippet}
						</LicenseLink>
					{/snippet}
				</AcceptAgreementsCheckbox>
			{/if}
		</div>

		{#snippet toolbar()}
			<ButtonGroup>
				<Button colorStyle="secondary-light" onclick={onReject}>
					{$i18n.core.text.reject}
				</Button>
				<Button
					colorStyle="primary"
					{disabled}
					loading={savingAgreements}
					onclick={onAccept}
					testId={AGREEMENTS_MODAL_ACCEPT_BUTTON}
				>
					{$i18n.agreements.text.accept_and_continue}
				</Button>
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</Modal>
