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

{#if $noAgreementVisionedYet || hasOutdatedAgreements}
	<div in:fade={{ delay: 0, duration: 250 }}>
		<Modal testId={LOADER_MODAL}>
			<h4 slot="title">Review terms & conditions</h4>
			<ContentWithToolbar>
				<Img src={agreementsBanner} styleClass="mb-6" />
				<p
					>Before you can use OISY Wallet, you must review and agree to our Terms of Service and
					Privacy Policy. These documents explain the rules of our service and how we protect your
					data.</p
				>

				<div class="flex flex-col font-bold" style="--checkbox-label-order: 1">
					<span class="flex items-center gap-1">
						<Checkbox
							inputId="termsOfUseCheckbox"
							on:nnsChange={() => toggleAccept('termsOfUse')}
							checked={acceptedAgreements['termsOfUse']}
							preventDefault={true}
						>
							I have read and agree to the
						</Checkbox>
						<span class="flex items-center gap-1 text-brand-primary">
							<TermsOfUseLink noUnderline />
							<IconExternalLink size="18" />
						</span>
					</span>
					<span class="flex items-center gap-1">
						<Checkbox
							inputId="privacyPolicyCheckbox"
							on:nnsChange={() => toggleAccept('privacyPolicy')}
							checked={acceptedAgreements['privacyPolicy']}
						>
							I have read and agree to the
						</Checkbox>
						<span class="flex items-center gap-1 text-brand-primary">
							<PrivacyPolicyLink noUnderline />
							<IconExternalLink size="18" />
						</span>
					</span>

					<span class="flex items-center gap-1">
						<Checkbox
							inputId="licenseAgreementCheckbox"
							on:nnsChange={() => toggleAccept('licenseAgreement')}
							checked={acceptedAgreements['licenseAgreement']}
						>
							I have read and agree to the
						</Checkbox>
						<span class="flex items-center gap-1 text-brand-primary">
							<LicenseLink noUnderline />
							<IconExternalLink size="18" />
						</span>
					</span>
				</div>

				{#snippet toolbar()}
					<ButtonGroup>
						<Button colorStyle="secondary-light">Reject</Button>
						<Button colorStyle="primary" disabled={!acceptedAllAgreements}
							>Accept and continue</Button
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
