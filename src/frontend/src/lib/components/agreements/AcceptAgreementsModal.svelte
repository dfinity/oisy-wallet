<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import type { EnvAgreements } from '$env/types/env-agreements';
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
	import { AGREEMENTS_MODAL } from '$lib/constants/test-ids.constants';
	import { hasOutdatedAgreements, outdatedAgreements } from '$lib/derived/user-agreements.derived';
	import { warnSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';

	type AgreementsToAcceptType = {
		[K in keyof EnvAgreements]?: boolean;
	};

	let agreementsToAccept: AgreementsToAcceptType = $state({});

	$effect(() => {
		Object.keys($outdatedAgreements).forEach(
			(agreementType) => (agreementsToAccept[agreementType as keyof EnvAgreements] = false)
		);
	});

	const acceptedAllAgreements = $derived(
		Object.values(agreementsToAccept).filter((a) => !a).length === 0
	);

	const toggleAccept = (type: keyof AgreementsToAcceptType) =>
		(agreementsToAccept[type] = !agreementsToAccept[type]);
</script>

<Modal testId={AGREEMENTS_MODAL}>
	<h4 slot="title">
		{$hasOutdatedAgreements
			? $i18n.agreements.text.review_updated_title
			: $i18n.agreements.text.review_title}
	</h4>
	<ContentWithToolbar>
		<Img src={agreementsBanner} styleClass="mb-6" />
		<p>
			{$hasOutdatedAgreements
				? $i18n.agreements.text.review_updated_description
				: $i18n.agreements.text.review_description}
		</p>

		<div style="--checkbox-label-order: 1" class="flex flex-col font-bold">
			{#if 'termsOfUse' in agreementsToAccept}
				<AcceptAgreementsCheckbox
					checked={agreementsToAccept['termsOfUse'] ?? false}
					inputId="termsOfUseCheckbox"
					isOutdated={$hasOutdatedAgreements}
					onChange={() => toggleAccept('termsOfUse')}
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
					isOutdated={$hasOutdatedAgreements}
					onChange={() => toggleAccept('privacyPolicy')}
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
					isOutdated={$hasOutdatedAgreements}
					onChange={() => toggleAccept('licenseAgreement')}
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
				<Button
					colorStyle="secondary-light"
					onclick={() => warnSignOut($i18n.agreements.text.reject_warning)}
					>{$i18n.core.text.reject}</Button
				>
				<Button colorStyle="primary" disabled={!acceptedAllAgreements}
					>{$i18n.agreements.text.accept_and_continue}</Button
				>
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</Modal>
