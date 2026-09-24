import { oisyTradeSwapEnabled } from '$env/oisy-trade-swap';
import { swapProviders } from '$lib/providers/swap.providers';
import { SwapProvider } from '$lib/types/swap';

// Deliberately unmocked: these assert the shipped registry entry. Behaviour
// with the flag on is covered in `oisy-trade-swap.services.spec.ts`, which
// mocks it true.
describe('swapProviders', () => {
	const oisyTrade = () => swapProviders.find(({ key }) => key === SwapProvider.OISY_TRADE);

	it('registers OISY Trade so the entry cannot be dropped by accident', () => {
		expect(oisyTrade()).toBeDefined();
	});

	// Against the *derived* gate, not `OISY_TRADE_SWAP_ENABLED` alone. The two
	// coincide only while `OISY_TRADE_ENABLED` is true, so comparing to the raw
	// flag would still pass if the registry stopped honouring the venue's own kill
	// switch — which is exactly the case this guards: a canister outage has to take
	// the swap offer down with the Trading tab, not leave a provider quoting
	// against a dead canister.
	it('gates the entry on the double flag, so a venue outage disables the offer', () => {
		expect(oisyTrade()?.isEnabled).toBe(oisyTradeSwapEnabled);
	});
});
