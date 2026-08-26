<script lang="ts">
	import type { IcToken } from '$icp/types/ic-token';
	import SeasonalIconAstronautHelmet from '$lib/components/core/SeasonalIconAstronautHelmet.svelte';
	import IconShareArrow from '$lib/components/icons/lucide/IconShareArrow.svelte';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import QrCode from '$lib/components/ui/QrCode.svelte';
	import { TIP_SHARE_COPY_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { canShare, shareText } from '$lib/utils/share.utils';

	interface Props {
		link: string;
		expiresAtNs: bigint;
		token: IcToken;
		amount: bigint;
		onDone: () => void;
	}

	let { link, expiresAtNs, token, amount, onDone }: Props = $props();

	// The absolute instant, not "in 24 hours": the sender may share this link days
	// later, and a relative deadline stops being true the moment the modal closes.
	let expiresAt = $derived(new Date(Number(expiresAtNs / 1_000_000n)).toLocaleString());

	// The reserved amount, not the text that was typed — this line is the sender's
	// only confirmation of what they actually committed.
	let amountLabel = $derived(
		`${formatToken({ value: amount, unitName: token.decimals, displayDecimals: token.decimals })} ${token.symbol}`
	);
</script>

<ContentWithToolbar>
	<div class="mb-3 flex items-center justify-center gap-2">
		<Logo alt={token.symbol} size="xs" src={token.icon} />

		<span class="text-xl font-bold">{amountLabel}</span>
	</div>

	<div class="mx-auto mb-4 aspect-square h-64 max-h-[40vh] max-w-full rounded-xl bg-white p-4">
		<QrCode ariaLabel={$i18n.tip.text.share_heading} value={link}>
			{#snippet logo()}
				<div class="flex items-center justify-center rounded-full bg-white p-1">
					<SeasonalIconAstronautHelmet />
				</div>
			{/snippet}
		</QrCode>
	</div>

	<MessageBox level="info" styleClass="mb-4">
		<p>{$i18n.tip.text.no_wallet_needed}</p>

		<p class="font-bold">
			{replacePlaceholders($i18n.tip.text.expires_at, { $date: expiresAt })}
		</p>
	</MessageBox>

	<div class="flex items-center gap-2 rounded-lg bg-brand-subtle-10 px-3 py-2">
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

	{#snippet toolbar()}
		<Button fullWidth onclick={onDone}>{$i18n.tip.text.done}</Button>
	{/snippet}
</ContentWithToolbar>
