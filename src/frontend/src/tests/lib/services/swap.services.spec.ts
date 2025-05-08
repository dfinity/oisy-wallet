// import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
// import type { IcToken } from '$icp/types/ic-token';
// import { fetchSwapAmounts } from '$lib/services/swap.services'; // Імпортуємо після моку
// import { SwapProvider, type FetchSwapAmountsParams } from '$lib/types/swap';
// import { mockIdentity } from '$tests/mocks/identity.mock';
// import { describe, expect, it, beforeEach, vi } from 'vitest';

// // Функція для отримання мокованих провайдерів
// const getMockedSwapProviders = () => [
//   {
//     key: SwapProvider.KONG_SWAP,
//     isEnabled: true,
//     getQuote: vi.fn().mockResolvedValue({ fake: 'kong' }),
//     mapQuoteResult: vi.fn().mockReturnValue({
//       provider: SwapProvider.KONG_SWAP,
//       receiveAmount: 1000n
//     })
//   },
//   {
//     key: SwapProvider.ICP_SWAP,
//     isEnabled: true,
//     getQuote: vi.fn().mockResolvedValue({ fake: 'icp' }),
//     mapQuoteResult: vi.fn().mockReturnValue({
//       provider: SwapProvider.ICP_SWAP,
//       receiveAmount: 900n
//     })
//   }
// ];

// // Мокування провайдерів перед імпортом
// vi.doMock('$lib/providers/swap.providers', () => ({
//   swapProviders: getMockedSwapProviders(),
//   SwapProvider
// }));

// describe('fetchSwapAmounts', () => {
//   const baseParams: FetchSwapAmountsParams = {
//     identity: mockIdentity,
//     sourceToken: ICP_TOKEN,
//     destinationToken: ICP_TOKEN,
//     amount: 1,
//     tokens: [],
//     slippage: 0.5
//   };

//   beforeEach(() => {
//     vi.clearAllMocks(); // Очищаємо моки перед кожним тестом
//   });

//   it('returns both providers when both succeed', async () => {
//     const result = await fetchSwapAmounts(baseParams);

//     expect(result).toHaveLength(2);
//     expect(result[0].provider).toBe(SwapProvider.KONG_SWAP);
//     expect(result[1].provider).toBe(SwapProvider.ICP_SWAP);
//   });

//   it('returns only one provider if the other fails', async () => {
//     const mockedSwapProviders = getMockedSwapProviders();
//     mockedSwapProviders[0].getQuote.mockRejectedValueOnce(new Error('fail'));

//     const result = await fetchSwapAmounts(baseParams);

//     expect(result).toHaveLength(1);
//     expect(result[0].provider).toBe(SwapProvider.ICP_SWAP);
//   });

//   it('returns empty if all fail', async () => {
//     const mockedSwapProviders = getMockedSwapProviders();
//     mockedSwapProviders.forEach((p) => p.getQuote.mockRejectedValueOnce(new Error('fail')));

//     const result = await fetchSwapAmounts(baseParams);

//     expect(result).toEqual([]);
//   });

//   it('skips disabled providers', async () => {
//     const mockedSwapProviders = getMockedSwapProviders();
//     mockedSwapProviders[1].isEnabled = false; // Вимикаємо ICP_SWAP

//     const result = await fetchSwapAmounts(baseParams);

//     expect(result).toHaveLength(1);
//     expect(result[0].provider).toBe(SwapProvider.KONG_SWAP);
//   });

//   it('returns empty if all providers are disabled', async () => {
//     const mockedSwapProviders = getMockedSwapProviders();
//     mockedSwapProviders.forEach((p) => (p.isEnabled = false)); // Вимикаємо всі провайдери

//     const result = await fetchSwapAmounts(baseParams);

//     expect(result).toEqual([]);
//   });
// });
