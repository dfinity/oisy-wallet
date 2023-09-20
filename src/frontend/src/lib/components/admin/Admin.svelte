<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { QRCode, Spinner } from '@dfinity/gix-components';
	import { canvasToBlob } from '$lib/utils/canvas.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { canShare, shareFile } from '$lib/utils/share.utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import IconShare from '$lib/components/icons/IconShare.svelte';
	import { onMount } from 'svelte';
	import { isAirdropManager } from '$lib/api/airdrop.api';

	let code: string | undefined;
	let busy = false;

	const generate = () => {
		busy = true;

		code = undefined;

		setTimeout(() => {
			code = 'yolo';

			busy = false;
		}, 2000);
	};

	const share = async () => {
		if (isNullish(code)) {
			toastsError({
				msg: { text: 'No code was generated.' }
			});
			return;
		}

		const canvas: HTMLCanvasElement | null = document.querySelector('.airdrop-qrcode canvas');

		if (isNullish(canvas)) {
			toastsError({
				msg: { text: 'No QR code to transform to an image found in the page.' }
			});
			return;
		}

		const blob = await canvasToBlob({ canvas, type: 'image/png' });

		if (isNullish(blob)) {
			toastsError({
				msg: { text: 'Cannot convert QR code to an image.' }
			});
			return;
		}

		await shareFile({
			file: new File([blob], `AirDrop code ${new Date().toLocaleString()}.png`, {
				type: 'image/png',
				lastModified: new Date().getTime()
			}),
			text: `AirDrop code: ${code}`
		});
	};

	const shareAvailable = canShare();
</script>

<h2 class="text-base mt-8 mb-2 pb-0.5">Admin</h2>

<div class="flex gap-2 mb-3" style="flex-wrap: wrap;">
	<button class="primary" on:click={generate} disabled={busy} class:opacity-50={busy}
		>Generate a new AirDrop code</button
	>

	{#if nonNullish(code) && shareAvailable}
		<button class="secondary" on:click={share}><IconShare /> Share</button>
	{/if}
</div>

{#if nonNullish(code)}
	<div in:fade>
		<div
			class="p-2 rounded-sm bg-off-white mb-3 airdrop-qrcode"
			style={`border: 1px dashed var(--color-dark); max-width: var(--qrcode-max-width, 360px); height: var(--qrcode-height);`}
		>
			<QRCode value={code} />
		</div>

		<label for="code" class="font-bold">Code:</label>
		<p id="code" class="flex gap-1 items-center">
			<output class="font-normal break-words">{code}</output><Copy
				value={code}
				text="Code copied to clipboard."
			/>
		</p>
	</div>
{:else if busy}
	<div
		class="flex items-start relative"
		style="width: var(--padding-6x); height: var(--padding-6x)"
	>
		<Spinner />
	</div>
{/if}
