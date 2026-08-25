<script lang="ts">
	import IconQr from '$lib/components/icons/IconQr.svelte';
	import IconShareArrow from '$lib/components/icons/lucide/IconShareArrow.svelte';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import QrCode from '$lib/components/ui/QrCode.svelte';
	import { TIP_SHARE_COPY_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { canShare, shareText } from '$lib/utils/share.utils';

	interface Props {
		link: string;
		expiresAtNs: bigint;
		onDone: () => void;
	}

	let { link, expiresAtNs, onDone }: Props = $props();

	// The absolute instant, not "in 24 hours": the sender may share this link days
	// later, and a relative deadline stops being true the moment the modal closes.
	let expiresAt = $derived(new Date(Number(expiresAtNs / 1_000_000n)).toLocaleString());
</script>

<ContentWithToolbar>
	<div class="mx-auto mb-6 aspect-square h-64 max-h-[40vh] max-w-full rounded-xl bg-white p-4">
		<QrCode ariaLabel={$i18n.tip.text.share_heading} value={link}>
			{#snippet logo()}
				<div class="flex items-center justify-center rounded-lg bg-primary p-2">
					<IconQr size="24" />
				</div>
			{/snippet}
		</QrCode>
	</div>

	<h3 class="mb-2 text-center">{$i18n.tip.text.share_heading}</h3>

	<p class="mb-4 text-center text-tertiary">{$i18n.tip.text.share_description}</p>

	<div class="mb-2 flex items-center gap-2 rounded-lg border border-secondary px-3 py-2">
		<output class="min-w-0 flex-1 truncate text-sm">{link}</output>

		<ReceiveCopy
			address={link}
			copyAriaLabel={$i18n.tip.text.copy_link}
			testId={TIP_SHARE_COPY_BUTTON}
		/>

		{#if canShare()}
			<ButtonIcon
				ariaLabel={$i18n.tip.text.share_link}
				link={false}
				onclick={async () => await shareText(link)}
			>
				{#snippet icon()}
					<IconShareArrow size="24" />
				{/snippet}
			</ButtonIcon>
		{/if}
	</div>

	<p class="text-center text-sm text-tertiary">
		{replacePlaceholders($i18n.tip.text.expires_at, { $date: expiresAt })}
	</p>

	{#snippet toolbar()}
		<Button fullWidth onclick={onDone}>{$i18n.tip.text.done}</Button>
	{/snippet}
</ContentWithToolbar>
