<script lang="ts">
	import { TIP_EXPIRY_OPTIONS } from '$lib/constants/tip.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		durationMs: number;
	}

	let { durationMs = $bindable() }: Props = $props();
</script>

<fieldset class="mb-4 border-0 p-0">
	<legend class="mb-2 font-bold">{$i18n.tip.text.expiration}</legend>

	<div class="flex gap-2" aria-label={$i18n.tip.text.expiration} role="radiogroup">
		{#each TIP_EXPIRY_OPTIONS as { ms, labelKey, recommended } (labelKey)}
			<button
				class="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm transition-colors {durationMs ===
				ms
					? 'border-brand-primary bg-brand-subtle-10 text-brand-primary'
					: 'border-secondary text-primary'}"
				aria-checked={durationMs === ms}
				onclick={() => (durationMs = ms)}
				role="radio"
				type="button"
			>
				<span class="font-bold">{$i18n.tip.text[labelKey]}</span>

				{#if recommended}
					<span class="text-xs text-tertiary">{$i18n.tip.text.recommended}</span>
				{/if}
			</button>
		{/each}
	</div>
</fieldset>
