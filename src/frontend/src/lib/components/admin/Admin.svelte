<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { QRCode, Spinner } from '@dfinity/gix-components';
	import { canvasToBlob } from '$lib/utils/canvas.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { canShare, shareFile } from '$lib/utils/share.utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import IconShare from '$lib/components/icons/IconShare.svelte';
	import { generateAirdropCode } from '$lib/api/airdrop.api';
	import type { CodeInfo } from '$declarations/airdrop/airdrop.did';
	import { airdropCodeUrl } from '$lib/utils/airdrop.utils';
	import { get } from 'svelte/store';
	import { authStore } from '$lib/stores/auth.store';

	let codeInfo: CodeInfo | undefined;
	let busy = false;

	let code: string | undefined;
	$: code = codeInfo?.code;

	let codeUrl: string;
	$: codeUrl = airdropCodeUrl(code);

	const generate = async () => {
		busy = true;

		codeInfo = undefined;

		try {
			const { identity } = get(authStore);

			const result = await generateAirdropCode(identity);

			if ('Err' in result) {
				const { Err } = result;

				toastsError({
					msg: { text: 'Unable to generate an Airdrop code.' },
					err: JSON.stringify(Err)
				});

				busy = false;

				return;
			}

			const { Ok } = result;
			codeInfo = Ok;
		} catch (err: unknown) {
			toastsError({
				msg: { text: 'Unexpected error while generating an Airdrop code.' },
				err
			});
		}

		busy = false;
	};

	const share = async () => {
		if (isNullish(codeInfo) || isNullish(codeUrl)) {
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
			text: codeUrl
		});
	};

	const shareAvailable = canShare();
</script>

<h2 class="text-base mb-4 pb-1">Admin</h2>

<div class="flex gap-4 mb-6" style="flex-wrap: wrap;">
	<button class="primary" on:click={generate} disabled={busy} class:opacity-50={busy}
		>Generate a new AirDrop code</button
	>

	{#if nonNullish(codeInfo) && shareAvailable}
		<button class="secondary" on:click={share}><IconShare /> Share</button>
	{/if}
</div>

{#if nonNullish(codeInfo)}
	{@const code = codeInfo.code}
	{@const generated = codeInfo.codes_generated}
	{@const redeemed = codeInfo.codes_redeemed}

	<div in:fade>
		<div
			class="p-4 rounded-sm bg-off-white mb-6 airdrop-qrcode"
			style={`border: 1px dashed var(--color-dark); max-width: var(--qrcode-max-width, 360px); height: var(--qrcode-height);`}
		>
			<QRCode value={codeUrl} />
		</div>

		<label for="code" class="font-bold">Code:</label>
		<p id="code" class="flex gap-1 items-center mb-4">
			<output class="font-normal break-all">{code}</output><Copy
				value={code}
				text="Code copied to clipboard."
			/>
		</p>

		<label for="codeUrl" class="font-bold">URL to use code:</label>
		<a
			id="codeUrl"
			class="flex gap-1 items-center mb-4"
			href={codeUrl}
			aria-label="URL to use the airdrop code"
		>
			{codeUrl}
		</a>

		<label for="generated" class="font-bold">Number of generated codes:</label>
		<p id="generated" class="flex gap-1 items-center mb-4">
			<output class="font-normal break-all">{generated}</output>
		</p>

		<label for="redeemed" class="font-bold">Number of redeemed codes:</label>
		<p id="redeemed" class="flex gap-1 items-center">
			<output class="font-normal break-all">{redeemed}</output>
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
