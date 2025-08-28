<script lang="ts">
	import { Modal, Checkbox } from '@dfinity/gix-components';
	import { type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { LOADER_MODAL } from '$lib/constants/test-ids.constants';
	import {
		hasAcceptedAllLatestAgreements,
		hasOutdatedAgreements,
		noAgreementVisionedYet
	} from '$lib/derived/agreements.derived';
	import agreementsBanner from '$lib/assets/banner-agreements.svg';
	import TermsOfUseLink from '$lib/components/terms-of-use/TermsOfUseLink.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import PrivacyPolicyLink from '$lib/components/privacy-policy/PrivacyPolicyLink.svelte';
	import LicenseLink from '$lib/components/license-agreement/LicenseLink.svelte';
	import IconExternalLink from '$lib/components/icons/IconExternalLink.svelte';
	import { warnSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let acceptedAgreements = $state({
		privacyPolicy: false,
		termsOfUse: false,
		licenseAgreement: false
	});

	const acceptedAllAgreements = $derived(
		Object.values(acceptedAgreements).filter((a) => !a).length === 0
	);

	const toggleAccept = (type: keyof typeof acceptedAgreements) =>
		(acceptedAgreements[type] = !acceptedAgreements[type]);
</script>

{#if $noAgreementVisionedYet || $hasOutdatedAgreements}
	<div in:fade={{ delay: 0, duration: 250 }}>
		<Modal testId={LOADER_MODAL}>
			<h4 slot="title">
				{$hasOutdatedAgreements
					? $i18n.agreements.text.review_title_updated
					: $i18n.agreements.text.review_title}
			</h4>
			<ContentWithToolbar>
				<Img src={agreementsBanner} styleClass="mb-6" />
				<p>
					{$hasOutdatedAgreements
						? $i18n.agreements.text.review_description_updated
						: $i18n.agreements.text.review_description}
				</p>

				<div class="flex flex-col font-bold" style="--checkbox-label-order: 1">
					<span class="flex items-center gap-1">
						<Checkbox
							inputId="termsOfUseCheckbox"
							on:nnsChange={() => toggleAccept('termsOfUse')}
							checked={acceptedAgreements['termsOfUse']}
							preventDefault={true}
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
					<span class="flex items-center gap-1">
						<Checkbox
							inputId="privacyPolicyCheckbox"
							on:nnsChange={() => toggleAccept('privacyPolicy')}
							checked={acceptedAgreements['privacyPolicy']}
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

					<span class="flex items-center gap-1">
						<Checkbox
							inputId="licenseAgreementCheckbox"
							on:nnsChange={() => toggleAccept('licenseAgreement')}
							checked={acceptedAgreements['licenseAgreement']}
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
				</div>

				{#snippet toolbar()}
					<ButtonGroup>
						<Button
							colorStyle="secondary-light"
							onclick={() =>
								warnSignOut(
									'You must accept the Terms and Conditions to proceed. Feel free to try again anytime.'
								)}>{$i18n.agreements.text.reject}</Button
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
