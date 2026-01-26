<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsPayment } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	interface Props {
		payProgressStep?: string;
	}

	let { payProgressStep = ProgressStepsPayment.REQUEST_DETAILS }: Props = $props();

	let steps = $state<ProgressSteps>([
		{
			step: ProgressStepsPayment.REQUEST_DETAILS,
			text: $i18n.pay.text.request_payment_details,
			state: 'in_progress'
		},
		{
			step: ProgressStepsPayment.CREATE_TRANSACTION,
			text: $i18n.pay.text.creating_transaction,
			state: 'next'
		},

		{
			step: ProgressStepsPayment.SIGN_TRANSACTION,
			text: $i18n.pay.text.signing_transaction,
			state: 'next'
		},
		{
			step: ProgressStepsPayment.PAY,
			text: $i18n.pay.text.paying,
			state: 'next'
		}
	]);
</script>

<InProgressWizard progressStep={payProgressStep} {steps} />
