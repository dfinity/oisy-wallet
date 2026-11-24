<script lang="ts">
	import IconHelpCircle from '$lib/components/icons/IconHelpCircle.svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import QrCode from '$lib/components/ui/QrCode.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	let scanning = $state(false);

	const scanOnReveal = (node: HTMLElement) => {
		if (typeof IntersectionObserver === 'undefined') {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					scanning = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.45 }
		);
		observer.observe(node);

		return () => observer.disconnect();
	};
</script>

<div
	class="grid size-full grid-rows-[auto_1fr_auto] bg-surface text-primary"
	{@attach scanOnReveal}
	aria-label={$i18n.auth.landing.pay_preview}
	role="img"
>
	<div class="contents" aria-hidden="true">
		<div class="relative grid place-items-center border-b border-tertiary px-6 py-2.5">
			<span class="text-center text-[11px] leading-tight font-bold">
				{$i18n.scanner.text.scan_qr_code}
			</span>
			<span class="absolute inset-e-2 flex"><IconClose size="12" /></span>
		</div>

		<div class="camera grid min-h-0 grid-rows-[1fr_auto] overflow-hidden p-2" class:scanning>
			<div class="grid min-h-0 place-items-center">
				<div class="finder relative grid aspect-square w-[62%] place-items-center">
					<div class="code-card aspect-square w-[75%] rounded-sm bg-white p-[8%]">
						<QrCode value="OISY Pay preview" />
					</div>
					<div class="beam-clip absolute inset-0 overflow-hidden rounded-lg">
						<span class="beam absolute inset-x-1 top-0 block h-full"></span>
					</div>
					<span class="corner top-0 left-0 rounded-tl-md border-t-2 border-l-2"></span>
					<span class="corner top-0 right-0 rounded-tr-md border-t-2 border-r-2"></span>
					<span class="corner bottom-0 left-0 rounded-bl-md border-b-2 border-l-2"></span>
					<span class="corner right-0 bottom-0 rounded-br-md border-r-2 border-b-2"></span>
				</div>
			</div>

			<div class="manual-entry grid gap-1 rounded-md bg-surface p-1.5 text-[8px] leading-tight">
				<span class="font-bold">{$i18n.scanner.text.url_or_code}</span>
				<span class="rounded-sm border border-secondary px-1.5 py-1.5 text-tertiary">
					{$i18n.scanner.text.enter_or_paste_code}
				</span>
				<span class="rounded-sm bg-disabled py-1.5 text-center font-bold text-disabled">
					{$i18n.core.text.continue}
				</span>
			</div>
		</div>

		<div class="flex items-center justify-center gap-1 border-t border-tertiary px-2 py-2">
			<span class="text-center text-[9px] leading-tight font-bold">
				{$i18n.scanner.text.what_is_scan}
			</span>
			<span class="flex shrink-0"><IconHelpCircle size="11" /></span>
		</div>
	</div>
</div>

<style lang="scss">
	@use '../../styles/theme/base-colors' as palette;

	.camera {
		// A soft pool of light and shallow diagonals suggest a checkout surface.
		background:
			radial-gradient(ellipse at 14% 8%, rgb(255 255 255 / 44%), transparent 64%),
			linear-gradient(133deg, transparent 42%, rgb(255 255 255 / 14%) 42% 54%, transparent 54%),
			linear-gradient(153deg, palette.$dusk-400, palette.$dusk-700);
	}

	.code-card {
		transform: rotate(-5deg);
		box-shadow:
			0 2px 3px rgb(0 0 0 / 10%),
			0 8px 18px rgb(0 0 0 / 22%);
	}

	.corner {
		position: absolute;
		width: 15%;
		height: 15%;
		border-color: white;
		filter: drop-shadow(0 1px 2px rgb(0 0 0 / 28%));
	}

	.beam {
		opacity: 0;
		background: linear-gradient(transparent 45%, rgb(130 234 242 / 74%) 50%, transparent 55%);
	}

	.manual-entry {
		box-shadow: 0 2px 12px rgb(0 0 0 / 10%);
	}

	@media (prefers-reduced-motion: no-preference) {
		.scanning .code-card {
			animation: settle-qr 900ms cubic-bezier(0.23, 1, 0.32, 1) both;
		}

		.scanning .beam {
			animation: scan-qr 1300ms 450ms ease-in-out both;
		}
	}

	@keyframes settle-qr {
		from {
			transform: translate(8%, 6%) rotate(-10deg);
		}
		to {
			transform: rotate(-5deg);
		}
	}

	@keyframes scan-qr {
		0% {
			transform: translateY(-48%);
			opacity: 0;
		}
		18%,
		78% {
			opacity: 0.8;
		}
		100% {
			transform: translateY(48%);
			opacity: 0;
		}
	}
</style>
