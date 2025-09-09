<script lang="ts">
	import { Modal, QRCode } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import IconAstronautHelmet from '$lib/components/icons/IconAstronautHelmet.svelte';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import SkeletonReceiveCopy from '$lib/components/receive/SkeletonReceiveCopy.svelte';
	import ShareButton from '$lib/components/share/ShareButton.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import SkeletonQrCode from '$lib/components/ui/SkeletonQrCode.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { OISY_REFERRAL_URL } from '$lib/constants/oisy.constants';
	import {
		REFERRAL_CODE_COPY_BUTTON,
		REFERRAL_CODE_LEARN_MORE,
		REFERRAL_CODE_SHARE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { getReferrerInfo } from '$lib/services/reward.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let referralCode: number | undefined = $state();
	let numberOfReferrals: number | undefined = $state();

	const referralUrl = $derived(`${window.location.origin}/?referrer=${referralCode}`);

	onMount(async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		const referrerInfo = await getReferrerInfo({ identity: $authIdentity });
		if (nonNullish(referrerInfo)) {
			({ referralCode, numberOfReferrals } = referrerInfo);
		}
	});
</script>

<Modal on:nnsClose={modalStore.close}>
	{#snippet title()}
		<span class="text-xl">{$i18n.referral.invitation.text.title}</span>
	{/snippet}

	<ContentWithToolbar>
		<div class="mx-auto mb-8 aspect-square h-80 max-h-[44vh] max-w-full rounded-xl bg-white p-4">
			{#if nonNullish(referralCode)}
				<QRCode value={referralUrl}>
					{#snippet logo()}
						<div class="flex items-center justify-center rounded-lg bg-primary p-2">
							<IconAstronautHelmet />
						</div>
					{/snippet}
				</QRCode>
			{:else}
				<SkeletonQrCode />
			{/if}
		</div>

		{#if nonNullish(referralCode)}
			<div class="flex items-center justify-between gap-4 rounded-lg bg-brand-subtle-20 px-3 py-2">
				<output class="break-all">{referralUrl}</output>
				<div class="flex gap-4">
					<ShareButton shareAriaLabel={referralUrl} testId={REFERRAL_CODE_SHARE_BUTTON} />
					<ReceiveCopy
						address={referralUrl}
						copyAriaLabel={$i18n.referral.invitation.text.referral_link_copied}
						testId={REFERRAL_CODE_COPY_BUTTON}
					/>
				</div>
			</div>

			<span class="mb-6 block w-full pt-3 text-center text-sm text-tertiary">
				{nonNullish(numberOfReferrals) && numberOfReferrals > 0
					? replacePlaceholders($i18n.referral.invitation.text.referred_amount, {
							$amount: numberOfReferrals.toString()
						})
					: $i18n.referral.invitation.text.not_referred_yet}
			</span>
		{:else}
			<div class="mb-6">
				<SkeletonReceiveCopy />

				<div class="pt-3">
					<SkeletonText />
				</div>
			</div>
		{/if}

		<MessageBox level="info">
			<div class="flex flex-col gap-3 sm:flex-row">
				{$i18n.referral.invitation.text.information}
				<ExternalLink
					ariaLabel={$i18n.referral.invitation.text.learn_more}
					href={OISY_REFERRAL_URL}
					iconAsLast
					styleClass="font-semibold min-w-30"
					testId={REFERRAL_CODE_LEARN_MORE}
				>
					{$i18n.referral.invitation.text.learn_more}
				</ExternalLink>
			</div>
		</MessageBox>

		{#snippet toolbar()}
			<ButtonCloseModal isPrimary />
		{/snippet}
	</ContentWithToolbar>
</Modal>
