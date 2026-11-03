import { BOB_TOKEN as BOB_ETH } from '$env/tokens/tokens-erc20/tokens.bob.env';
import { CHAT_TOKEN as CHAT_ETH } from '$env/tokens/tokens-erc20/tokens.chat.env';
import { GLDT_TOKEN as GLDT_ETH } from '$env/tokens/tokens-erc20/tokens.gldt.env';
import { ICP_TOKEN as ICP_ETH } from '$env/tokens/tokens-erc20/tokens.icp.env';
import { BOB_TOKEN as BOB_ARBITRUM } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.bob.env';
import { CHAT_TOKEN as CHAT_ARBITRUM } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.chat.env';
import { GLDT_TOKEN as GLDT_ARBITRUM } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.gldt.env';
import { ICP_TOKEN as ICP_ARBITRUM } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.icp.env';
import { BOB_TOKEN as BOB_BASE } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.bob.env';
import { CHAT_TOKEN as CHAT_BASE } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.chat.env';
import { GLDT_TOKEN as GLDT_BASE } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.gldt.env';
import { ICP_TOKEN as ICP_BASE } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.icp.env';
import { ERC20_SUGGESTED_TOKENS } from '$env/tokens/tokens.erc20.env';

/**
 * The EVM tokens added for the 1Sec integration (BOB/CHAT/GLDT on Ethereum,
 * Arbitrum and Base) are curated metadata only: they must stay flagged
 * `metadataOnly` so they are not surfaced to new users while still enriching a
 * manual import. Pinned here so an accidental un-demotion trips an assertion.
 *
 * ICP is intentionally excluded from this demotion: unlike BOB/CHAT/GLDT,
 * users may already hold a balance in the EVM ICP twin tokens, and marking
 * them metadata-only would remove them from the default ERC20 token set,
 * potentially hiding that balance unless the user explicitly imports them; ICP therefore stays curated/suggested.
 */
describe('1Sec EVM tokens are metadata-only', () => {
	it.each([
		{ name: 'BOB (Ethereum)', token: BOB_ETH },
		{ name: 'CHAT (Ethereum)', token: CHAT_ETH },
		{ name: 'GLDT (Ethereum)', token: GLDT_ETH },
		{ name: 'BOB (Arbitrum)', token: BOB_ARBITRUM },
		{ name: 'CHAT (Arbitrum)', token: CHAT_ARBITRUM },
		{ name: 'GLDT (Arbitrum)', token: GLDT_ARBITRUM },
		{ name: 'BOB (Base)', token: BOB_BASE },
		{ name: 'CHAT (Base)', token: CHAT_BASE },
		{ name: 'GLDT (Base)', token: GLDT_BASE }
	])('$name is flagged metadataOnly', ({ token }) => {
		expect(token.metadataOnly).toBeTruthy();
	});

	it.each([
		{ name: 'ICP (Ethereum)', token: ICP_ETH },
		{ name: 'ICP (Arbitrum)', token: ICP_ARBITRUM },
		{ name: 'ICP (Base)', token: ICP_BASE }
	])('$name is NOT flagged metadataOnly', ({ token }) => {
		expect(token.metadataOnly).toBeFalsy();
	});

	it('still suggests the 1Sec EVM ICP tokens', () => {
		const suggestedIds = new Set(ERC20_SUGGESTED_TOKENS.map(({ id }) => id));

		expect(suggestedIds.has(ICP_ETH.id)).toBeTruthy();
		expect(suggestedIds.has(ICP_ARBITRUM.id)).toBeTruthy();
		expect(suggestedIds.has(ICP_BASE.id)).toBeTruthy();
	});
});
