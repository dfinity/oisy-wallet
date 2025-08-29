<script lang="ts">
	import { Modal, Checkbox } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { EnvAgreements } from '$env/types/env-agreements';
	import agreementsBanner from '$lib/assets/banner-agreements.svg';
	import IconExternalLink from '$lib/components/icons/IconExternalLink.svelte';
	import LicenseLink from '$lib/components/license-agreement/LicenseLink.svelte';
	import PrivacyPolicyLink from '$lib/components/privacy-policy/PrivacyPolicyLink.svelte';
	import TermsOfUseLink from '$lib/components/terms-of-use/TermsOfUseLink.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { LOADER_MODAL } from '$lib/constants/test-ids.constants';
	import {
		hasAcceptedAllLatestAgreements,
		hasOutdatedAgreements,
		noAgreementVisionedYet,
		outdatedAgreements
	} from '$lib/derived/agreements.derived';
	import { warnSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

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

{#if $noAgreementVisionedYet || $hasOutdatedAgreements}
	<div in:fade={{ delay: 0, duration: 250 }}>
		<Modal testId={LOADER_MODAL}>
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
						<span class="flex items-center gap-1">
							<Checkbox
								checked={agreementsToAccept['termsOfUse'] ?? false}
								inputId="termsOfUseCheckbox"
								preventDefault={true}
								on:nnsChange={() => toggleAccept('termsOfUse')}
							>
								{#if $hasOutdatedAgreements}
									{$i18n.agreements.text.i_have_accepted_updated}
								{:else}
									{$i18n.agreements.text.i_have_accepted}
								{/if}
							</Checkbox>
							<span class="flex items-center gap-1 text-brand-primary">
								<TermsOfUseLink noUnderline>
									{#snippet icon()}
										<IconExternalLink size="18" />
									{/snippet}
								</TermsOfUseLink>
							</span>
						</span>
					{/if}
					{#if 'privacyPolicy' in agreementsToAccept}
						<span class="flex items-center gap-1">
							<Checkbox
								checked={agreementsToAccept['privacyPolicy'] ?? false}
								inputId="privacyPolicyCheckbox"
								on:nnsChange={() => toggleAccept('privacyPolicy')}
							>
								{#if $hasOutdatedAgreements}
									{$i18n.agreements.text.i_have_accepted_updated}
								{:else}
									{$i18n.agreements.text.i_have_accepted}
								{/if}
							</Checkbox>
							<span class="flex items-center gap-1 text-brand-primary">
								<PrivacyPolicyLink noUnderline>
									{#snippet icon()}
										<IconExternalLink size="18" />
									{/snippet}
								</PrivacyPolicyLink>
							</span>
						</span>
					{/if}
					{#if 'licenceAgreement' in agreementsToAccept}
						<span class="flex items-center gap-1">
							<Checkbox
								checked={agreementsToAccept['licenceAgreement'] ?? false}
								inputId="licenseAgreementCheckbox"
								on:nnsChange={() => toggleAccept('licenceAgreement')}
							>
								{#if $hasOutdatedAgreements}
									{$i18n.agreements.text.i_have_accepted_updated}
								{:else}
									{$i18n.agreements.text.i_have_accepted}
								{/if}
							</Checkbox>
							<span class="flex items-center gap-1 text-brand-primary">
								<LicenseLink noUnderline>
									{#snippet icon()}
										<IconExternalLink size="18" />
									{/snippet}
								</LicenseLink>
							</span>
						</span>
					{/if}
				</div>

				{#snippet toolbar()}
					<ButtonGroup>
						<Button
							colorStyle="secondary-light"
							onclick={() => warnSignOut($i18n.agreements.text.reject_warning)}
							>{$i18n.agreements.text.reject}</Button
						>
						<Button colorStyle="primary" disabled={!acceptedAllAgreements}
							>{$i18n.agreements.text.accept_and_continue}</Button
						>
					</ButtonGroup>
				{/snippet}
			</ContentWithToolbar>
		</Modal>
	</div>
{:else if $hasAcceptedAllLatestAgreements}
	<div in:fade>
		{@render children()}
	</div>
{:else}
	SIGNOUT here or something
{/if}
