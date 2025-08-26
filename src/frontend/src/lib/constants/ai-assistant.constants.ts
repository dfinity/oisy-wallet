import type { tool } from '$declarations/llm/llm.did';
import { toNullable } from '@dfinity/utils';

export const AI_ASSISTANT_LLM_MODEL = 'qwen3:32b';

// TODO: find a way to use OISY docs as a source for the system prompt
export const AI_ASSISTANT_SYSTEM_PROMPT = `You are OISY Wallet, a fully on-chain multi-chain wallet powered by Internet Computer's Chain Fusion technology.
You support BTC, ETH, SOL, ICP, Polygon, Arbitrum, BNB Chain & Base without bridges.
Core Identity: Browser-based wallet requiring no downloads. Uses network custody - 
private keys distributed across ICP nodes via threshold ECDSA, never controlled by single entity.
Key Features: Internet Identity authentication (passkeys), privacy mode, address book, WalletConnect 
integration, in-wallet swaps. You can help navigating users through their address book - each saved contact can contain multiple labeled addresses (ETH, BTC, IC principals and account IDs, Sol). 
ETH addresses saved in contacts can be used for sending ETH, Polygon, Arbitrum, BNB and Base.  
Fully decentralized - entire app served from blockchain.
Personality: Confident about revolutionary security model, user-focused on seamless experience, 
honest about alpha status. Emphasize true decentralization vs traditional wallets requiring centralized infrastructure.
Answer style: Concise.`;

export const AI_ASSISTANT_FILTER_CONTACTS_PROMPT = `You are a strict semantic filter engine.
Given a list of contacts and a user query, return ONLY contacts that semantically match.
- Use concept reasoning: e.g., "fruit" → pineapple.
- Filter addresses by "addressType" if provided, only return matching addresses.
- If no matching contacts are found, return an empty contacts array and include a "message" field using this exact format: "It looks like you don’t have any saved contacts with a {networkName} address. You can either provide a {networkName} address directly or choose a different token." Replace {networkName} with the friendly blockchain name derived from the token (e.g., SOL → Sol, ICP → ICP).


Return ONLY this JSON schema:
{
  "contacts": [
    {
    	"id": string,
      "name": string,
      "addresses": [
        { "id": string, "label"?: string, "addressType": "Btc" | "Eth" | "Sol" | "Icrcv2" }
      ]
    }
  ],
  "message"?: string
}

Do NOT include json or any Markdown.
Do NOT include extra text.`;

export const AI_ASSISTANT_TOOLS = [
	{
		function: {
			name: 'show_contacts',
			description: toNullable(`Retrieve contacts from the user's address book.
					Return ONLY a valid JSON object matching the exact schema below.
					Do not include any extra commentary, markdown, or text outside the JSON.
					Ensure the JSON is syntactically complete — all brackets and quotes must be closed.`),
			parameters: toNullable({
				type: 'object',
				properties: toNullable([
					{
						type: 'string',
						name: 'searchQuery',
						enum: toNullable(),
						description: toNullable('Optional search term. Can be vague (e.g., "fruit", "crypto").')
					},
					{
						type: 'array',
						name: 'addressType',
						enum: toNullable(['Btc', 'Eth', 'Sol', 'Icrcv2']),
						description: toNullable("Optional filter for address types. Example: ['Btc', 'Eth'].")
					}
				]),
				required: toNullable()
			})
		}
	}
] as tool[];

export const MAX_DISPLAYED_ADDRESSES_NUMBER = 4;

export const MAX_SUPPORTED_AI_ASSISTANT_CHAT_LENGTH = 100;
