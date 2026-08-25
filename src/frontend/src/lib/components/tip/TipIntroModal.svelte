<script lang="ts">
	import IconQr from '$lib/components/icons/IconQr.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { OISY_DOCS_URL } from '$lib/constants/oisy.constants';
	import {
		TIP_INTRO_GET_STARTED_BUTTON,
		TIP_INTRO_HISTORY_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<Modal onClose={modalStore.close}>
	{#snippet title()}
		<span class="text-xl">{$i18n.tip.text.intro_title}</span>
	{/snippet}

	<ContentWithToolbar>
		<div
			class="mx-auto mb-6 flex aspect-square h-40 max-w-full items-center justify-center rounded-xl bg-brand-subtle-10 text-brand-primary"
			aria-label={$i18n.tip.alt.intro_illustration}
			role="img"
		>
			<IconQr size="64" />
		</div>

		<h3 class="mb-3 text-center">{$i18n.tip.text.intro_heading}</h3>

		<p class="mb-4 text-center text-tertiary">{$i18n.tip.text.intro_body}</p>

		<div class="mb-4 flex justify-center">
			<ExternalLink
				ariaLabel={$i18n.tip.text.learn_how_it_works}
				href={OISY_DOCS_URL}
				iconVisible={true}
			>
				{$i18n.tip.text.learn_how_it_works}
			</ExternalLink>
		</div>

		{#snippet toolbar()}
			<div class="flex gap-3">
				<Button
					colorStyle="secondary-light"
					fullWidth
					onclick={modalStore.close}
					testId={TIP_INTRO_HISTORY_BUTTON}
				>
					{$i18n.tip.text.view_history}
				</Button>

				<Button fullWidth onclick={modalStore.close} testId={TIP_INTRO_GET_STARTED_BUTTON}>
					{$i18n.tip.text.get_started}
				</Button>
			</div>
		{/snippet}
	</ContentWithToolbar>
</Modal>
