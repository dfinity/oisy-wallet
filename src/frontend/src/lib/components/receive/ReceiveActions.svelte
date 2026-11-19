<script lang="ts">
	import { onMount, tick } from 'svelte';
	import IconQrCodeScanner from '$lib/components/icons/IconQrCodeScanner.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import type { ReceiveQRCodeAction } from '$lib/types/receive';

	interface Props {
		address: string;
		qrCodeAction?: ReceiveQRCodeAction;
		copyAriaLabel: string;
		// The confirmation once copied; the button's name otherwise reads it too.
		copiedText?: string;
		copyButtonTestId?: string;
	}

	let {
		address,
		qrCodeAction = { enabled: false },
		copyAriaLabel,
		copiedText,
		copyButtonTestId
	}: Props = $props();

	let qrCodeButton = $state<HTMLButtonElement | undefined>();

	onMount(async () => {
		if (!qrCodeAction.enabled || qrCodeAction.autofocus !== true) {
			return;
		}

		await tick();
		qrCodeButton?.focus({ preventScroll: true });
	});
</script>

<!-- The app's link-style icon buttons, as Copy is everywhere else: blue, no fill, 20px. -->
<div class="flex justify-center gap-2">
	{#if qrCodeAction.enabled}
		<ButtonIcon
			ariaLabel={qrCodeAction.ariaLabel}
			onclick={qrCodeAction.onClick}
			testId={qrCodeAction.testId}
			bind:button={qrCodeButton}
		>
			{#snippet icon()}
				<IconQrCodeScanner />
			{/snippet}
		</ButtonIcon>
	{/if}

	<Copy
		ariaLabel={copyAriaLabel}
		testId={copyButtonTestId}
		text={copiedText ?? copyAriaLabel}
		value={address}
	/>
</div>
