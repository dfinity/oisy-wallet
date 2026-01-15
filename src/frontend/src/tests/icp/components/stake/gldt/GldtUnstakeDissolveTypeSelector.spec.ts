import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtUnstakeDissolveTypeSelector from '$icp/components/stake/gldt/GldtUnstakeDissolveTypeSelector.svelte';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { fireEvent, render } from '@testing-library/svelte';

describe('GldtUnstakeDissolveTypeSelector', () => {
	const mockContext = () =>
		new Map<symbol, SendContext | GldtStakeContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })],
			[GLDT_STAKE_CONTEXT_KEY, { store: initGldtStakeStore() }]
		]);

	it('should switch between selected radio buttons correctly', async () => {
		const { getAllByRole } = render(GldtUnstakeDissolveTypeSelector, {
			props: { dissolveInstantly: true, amount: 1 },
			context: mockContext()
		});

		const delayedDissolveCheckbox = getAllByRole('radio')[0] as HTMLInputElement;
		const dissolveInstantlyCheckbox = getAllByRole('radio')[1] as HTMLInputElement;

		expect(dissolveInstantlyCheckbox.checked).toBeTruthy();
		expect(delayedDissolveCheckbox.checked).toBeFalsy();

		await fireEvent.click(delayedDissolveCheckbox);

		expect(dissolveInstantlyCheckbox.checked).toBeFalsy();
		expect(delayedDissolveCheckbox.checked).toBeTruthy();
	});
});
