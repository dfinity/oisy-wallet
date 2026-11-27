import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import SwapDestinationStep from '$lib/components/swap/SwapDestinationStep.svelte';
import { SEND_FORM_DESTINATION_NEXT_BUTTON } from '$lib/constants/test-ids.constants';
import * as addressDerived from '$lib/derived/address.derived';
import { initSwapContext, SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { mockEthAddress, mockEthAddress3 } from '$tests/mocks/eth.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

describe('SwapDestinationStep', () => {
	const onBack = vi.fn();
	const onQRCodeScan = vi.fn();

	const setup = (draft: string) => {
		const swapContext = initSwapContext({
			sourceToken: ICP_TOKEN,
			destinationToken: ETHEREUM_TOKEN
		});

		swapContext.customDestinationDraft.set(draft);

		const { getByTestId } = render(SwapDestinationStep, {
			props: { token: ETHEREUM_TOKEN, onBack, onQRCodeScan },
			context: new Map([[SWAP_CONTEXT_KEY, swapContext]])
		});

		return { swapContext, getByTestId };
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(addressDerived, 'ethAddress', 'get').mockImplementation(() =>
			readable(mockEthAddress)
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sets the address entered and returns to the form', async () => {
		const { swapContext, getByTestId } = setup(mockEthAddress3);

		await fireEvent.click(getByTestId(SEND_FORM_DESTINATION_NEXT_BUTTON));

		expect(get(swapContext.customDestination)).toBe(mockEthAddress3);
		expect(onBack).toHaveBeenCalledOnce();
	});

	it("counts the user's own address as their OISY wallet", async () => {
		const { swapContext, getByTestId } = setup(mockEthAddress.toLowerCase());

		swapContext.setCustomDestination(mockEthAddress3);

		await fireEvent.click(getByTestId(SEND_FORM_DESTINATION_NEXT_BUTTON));

		expect(get(swapContext.customDestination)).toBeUndefined();
		expect(onBack).toHaveBeenCalledOnce();
	});
});
