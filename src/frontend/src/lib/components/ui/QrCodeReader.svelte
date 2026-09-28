<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import IconQrCodeScanner from '$lib/components/icons/IconQrCodeScanner.svelte';
	import { isDesktop } from '$lib/utils/device.utils';
	import { nextElementId } from '$lib/utils/html.utils';

	interface Props {
		universalScanner?: boolean;
	}

	let { universalScanner = false }: Props = $props();

	const id = nextElementId('qrcode-reader-');

	const dispatch = createEventDispatcher();

	let videoElement: HTMLVideoElement | undefined;
	let stream: MediaStream | undefined;
	let scanInterval: NodeJS.Timeout | undefined;
	let isDestroyed = false;
	let isProcessingFrame = false;

	// False while the OS permission prompt is up and the camera warms — the
	// video element is an empty void then, so a placeholder covers it.
	let streaming = $state(false);

	onMount(async () => {
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'environment',
					width: { ideal: 1920 },
					height: { ideal: 1080 }
				},
				audio: false
			});

			if (isDestroyed) {
				stopStream();

				return;
			}

			if (nonNullish(videoElement)) {
				videoElement.srcObject = stream;

				await videoElement.play();

				streaming = true;

				await startScanning();
			}
		} catch (err: unknown) {
			dispatch('nnsQRCodeError', err);
		}
	});

	const startScanning = async () => {
		try {
			const { BarcodeDetector } = await import('barcode-detector/ponyfill');

			if (isDestroyed) {
				return;
			}

			const detector = new BarcodeDetector({
				formats: ['qr_code']
			});

			const scan = async () => {
				if (
					isProcessingFrame ||
					isDestroyed ||
					isNullish(videoElement) ||
					videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
				) {
					return;
				}

				isProcessingFrame = true;

				try {
					const results = await detector.detect(videoElement);

					const [qrResult] = results;

					if (nonNullish(qrResult)) {
						dispatch('nnsQRCode', qrResult.rawValue);
					}
				} catch {
					// Decoding failed on this frame — expected when no QR code is visible
				} finally {
					isProcessingFrame = false;
				}
			};

			scanInterval = setInterval(scan, 100);
		} catch (err: unknown) {
			dispatch('nnsQRCodeError', err);
		}
	};

	const stopStream = () => {
		if (nonNullish(stream)) {
			stream.getTracks().forEach((track) => track.stop());

			stream = undefined;
		}
	};

	onDestroy(() => {
		isDestroyed = true;

		if (nonNullish(scanInterval)) {
			clearInterval(scanInterval);

			scanInterval = undefined;
		}

		stopStream();
	});

	// We optimistically assume that if the QR code reader is used on desktop, it has most probably only a single "user" facing camera and that we can invert the displayed video
	const mirror = isDesktop();

	const cornerBase = 'absolute h-10 w-10 border-solid border-white';
</script>

<article {id} class="relative h-full w-full overflow-hidden {mirror ? '-scale-x-100' : ''}">
	<video
		bind:this={videoElement}
		class="block h-full w-full object-cover"
		autoplay
		muted
		playsinline
	></video>

	{#if !streaming}
		<!-- Camera surface placeholder: conventionally dark regardless of app
		     theme; icon-only so it needs no copy and survives the mirror flip. -->
		<div
			class="absolute inset-0 flex items-center justify-center rounded-lg bg-black"
			out:fade={{ duration: 250 }}
		>
			<span class="animate-pulse text-white/40">
				<IconQrCodeScanner size="64px" />
			</span>
		</div>
	{/if}

	<div
		class="[container-type:size] pointer-events-none absolute inset-0 flex h-full items-center justify-center"
		class:sm:h-[70%]={universalScanner}
	>
		<div class="relative aspect-square w-[min(60cqw,60cqh)]">
			<span class="{cornerBase} top-0 left-0 rounded-tl-xl border-t-[5px] border-l-[5px]"></span>
			<span class="{cornerBase} top-0 right-0 rounded-tr-xl border-t-[5px] border-r-[5px]"></span>
			<span class="{cornerBase} bottom-0 left-0 rounded-bl-xl border-b-[5px] border-l-[5px]"></span>
			<span class="{cornerBase} right-0 bottom-0 rounded-br-xl border-r-[5px] border-b-[5px]"
			></span>
		</div>
	</div>
</article>
