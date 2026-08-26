<script lang="ts">
	import IconArrowRight from '$lib/components/icons/IconArrowRight.svelte';
	import IconQr from '$lib/components/icons/IconQr.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_DOCS_URL } from '$lib/constants/oisy.constants';
	import {
		TIP_INTRO_GET_STARTED_BUTTON,
		TIP_INTRO_HISTORY_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onGetStarted: () => void;
		onViewHistory: () => void;
	}

	let { onGetStarted, onViewHistory }: Props = $props();
</script>

<ContentWithToolbar>
	<!--
		Landscape, matching the drawn panel, rather than the square it was. The
		illustration itself is still a placeholder: the Figma page composes it from
		layers and exports no asset, so this is a holding pattern, not a decision.
	-->
	<div
		class="mb-6 flex aspect-16/9 w-full items-center justify-center rounded-xl bg-brand-subtle-10 text-brand-primary"
		aria-label={$i18n.tip.alt.intro_illustration}
		role="img"
	>
		<IconQr size="64" />
	</div>

	<h3 class="mb-3">{$i18n.tip.text.intro_heading}</h3>

	<p class="mb-4 text-tertiary">{$i18n.tip.text.intro_body}</p>

	<div class="mb-4">
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
				onclick={onViewHistory}
				testId={TIP_INTRO_HISTORY_BUTTON}
			>
				{$i18n.tip.text.view_history}
			</Button>

			<Button fullWidth onclick={onGetStarted} testId={TIP_INTRO_GET_STARTED_BUTTON}>
				{$i18n.tip.text.get_started}

				<IconArrowRight />
			</Button>
		</div>
	{/snippet}
</ContentWithToolbar>
