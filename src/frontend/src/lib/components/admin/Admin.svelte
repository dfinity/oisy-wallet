<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { QRCode, Spinner } from '@dfinity/gix-components';

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
</script>

<h2 class="text-base mt-8 mb-2 pb-0.5">Admin</h2>

<button class="primary mb-3" on:click={generate} disabled={busy} class:opacity-50={busy}
	>Generate a new Airdrop code</button
>

{#if nonNullish(code)}
	<div in:fade>
		<div
			class="p-2 rounded-sm bg-off-white mb-3"
			style={`border: 1px dashed var(--color-dark); max-width: var(--qrcode-max-width, 360px); height: var(--qrcode-height);`}
		>
			<QRCode value={code} />
		</div>

		<label for="code" class="font-bold">Code:</label>
		<p id="code" class="font-normal break-words">{code}</p>
	</div>
{:else if busy}
	<div
		class="flex items-start relative"
		style="width: var(--padding-6x); height: var(--padding-6x)"
	>
		<Spinner />
	</div>
{/if}
