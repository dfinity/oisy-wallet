<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { PLUG_MAX_ACCOUNT_INDEX } from '$lib/constants/plug.constants';
	import {
		PLUG_IMPORT_ACCOUNTS_INPUT,
		PLUG_IMPORT_PHRASE_INPUT,
		PLUG_IMPORT_RESET_BUTTON,
		PLUG_IMPORT_SUBMIT_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { isValidPlugSeedPhrase } from '$lib/utils/plug.utils';

	interface Props {
		phrase: string;
		depth: number;
		loading?: boolean;
		onsubmit: () => void;
		onreset: () => void;
	}

	let {
		phrase = $bindable(),
		depth = $bindable(),
		loading = false,
		onsubmit,
		onreset
	}: Props = $props();

	let canSubmit = $derived(!loading && isValidPlugSeedPhrase(phrase));
</script>

<form
	onsubmit={(event) => {
		event.preventDefault();
		if (canSubmit) {
			onsubmit();
		}
	}}
>
	<label class="flex w-full flex-col gap-2" for={PLUG_IMPORT_PHRASE_INPUT}>
		<span class="font-bold">{$i18n.plug_import.text.phrase_label}</span>

		<!-- A seed phrase must not be captured by autofill or a password manager, nor
			corrected by the browser, so every assistive behaviour is switched off. It is
			also never written anywhere but this component's state. -->
		<textarea
			id={PLUG_IMPORT_PHRASE_INPUT}
			class="min-h-24 w-full resize-none rounded-lg border border-brand-subtle-20 bg-primary p-4 text-base font-normal text-primary outline-none transition-colors placeholder:text-tertiary focus:border-brand-primary"
			autocapitalize="off"
			autocomplete="off"
			data-tid={PLUG_IMPORT_PHRASE_INPUT}
			disabled={loading}
			placeholder={$i18n.plug_import.text.phrase_placeholder}
			spellcheck="false"
			bind:value={phrase}></textarea>
	</label>

	<label class="mt-4 flex w-full flex-col gap-2" for={PLUG_IMPORT_ACCOUNTS_INPUT}>
		<span class="font-bold">{$i18n.plug_import.text.accounts_label}</span>

		<input
			id={PLUG_IMPORT_ACCOUNTS_INPUT}
			class="w-24 rounded-lg border border-brand-subtle-20 bg-primary p-3 text-base font-normal text-primary outline-none transition-colors focus:border-brand-primary"
			data-tid={PLUG_IMPORT_ACCOUNTS_INPUT}
			disabled={loading}
			max={PLUG_MAX_ACCOUNT_INDEX + 1}
			min="1"
			type="number"
			bind:value={depth}
		/>

		<span class="text-sm text-tertiary">{$i18n.plug_import.text.accounts_hint}</span>
	</label>

	<div class="mt-6 flex flex-row gap-3">
		<Button disabled={!canSubmit} {loading} testId={PLUG_IMPORT_SUBMIT_BUTTON} type="submit">
			{$i18n.plug_import.text.submit}
		</Button>

		<Button
			colorStyle="secondary-light"
			disabled={loading}
			onclick={onreset}
			testId={PLUG_IMPORT_RESET_BUTTON}
			type="button"
		>
			{$i18n.plug_import.text.reset}
		</Button>
	</div>
</form>
