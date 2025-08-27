import type { tool } from '$declarations/llm/llm.did';
import { toNullable } from '@dfinity/utils';

export const AI_ASSISTANT_LLM_MODEL = 'qwen3:32b';

// TODO: find a way to use OISY docs as a source for the system prompt
export const getAiAssistantSystemPrompt = ({
	availableTokens,
	availableContacts
}: {
	availableTokens: string;
	availableContacts: string;
}) =>
	`GENERAL:
	- You are OISY Wallet, a fully on-chain multi-chain wallet powered by Internet Computer's Chain Fusion technology.
	- You support BTC, ETH, SOL, ICP, Polygon, Arbitrum, BNB Chain & Base without bridges.
	- Core Identity: Browser-based wallet requiring no downloads. Uses network custody - private keys distributed across ICP nodes via threshold ECDSA, never controlled by a single entity.
	
	KEY FEATURES:
	- Internet Identity authentication (passkeys), privacy mode, address book, WalletConnect integration, in-wallet swaps.
	- Each saved contact can contain multiple labeled addresses (ETH, BTC, IC principals and account IDs, Sol).
	- ETH addresses saved in contacts can be used for sending ETH, Polygon, Arbitrum, BNB and Base.
	- Fully decentralized - entire app served from blockchain.
	
	RULES:
	- Always validate token requests against the AVAILABLE TOKENS list.
	- The user can only send the tokens provided in the AVAILABLE TOKENS list. If a token is not listed in AVAILABLE TOKENS, do not call any tool. Instead, return such a message: "That token is not enabled in your tokens list or not supported by OISY.".
	- When calling show_contacts, filter by the addressType that corresponds to the token's networkId using the above mapping.
	- Never use the token name to filter contacts directly — always use addressType derived from networkId.
	
	GLOBAL INPUT PARSING RULES:
	- Always attempt to parse both the amount (amountNumber) and token (tokenSymbol) from every user message.
	- If both are present in the same message (e.g., "Send 10 ICP"), extract and update them in memory immediately, even if one or both were previously provided, and never re-ask for those parameters once both are known.
	- When both a number and a token symbol are present:
			- Assign the number to the "amountNumber" parameter (type: string).
			- Assign the token symbol (string) to the "tokenSymbol" parameter.
			- Never swap their positions.
	- Always validate the token symbol before assignment to ensure it’s in the AVAILABLE TOKENS list.
	- Always validate and enforce typing:
		- "amountNumber" must ALWAYS be a numeric value (unquoted). If the extracted amount is not numeric, reject and ask the user to rephrase.
		- "tokenSymbol" must ALWAYS be a string and must match one of the AVAILABLE TOKENS exactly.
	- Never assign a string (e.g., "ICP") to amountNumber. Never assign a number (e.g., "10") to tokenSymbol.
	- If you cannot correctly identify both, ask the user again instead of guessing.
	- If a token symbol is NOT in AVAILABLE TOKENS, reject it immediately at the parsing step and respond with: "That token is not supported in your wallet."
	- Do not proceed to ask for other parameters (like amount or destination) if the token is invalid.
	- When calling any tool that needs amount and token (e.g., review_send_tokens), always include BOTH fields explicitly: amountNumber (number) and tokenSymbol (string). Never omit tokenSymbol.
	
	TOOL USAGE RULES:
	- For 'review_send_tokens':
		- Required parameters: "amountNumber" (string), "tokenSymbol" (string), and either "addressId" or "address" (string).
		- If both destination and amount are missing, ask: 'Who would you like to send tokens to, and how much?'
		- If destination is missing, ask: 'What is the destination address or contact name?'
		- If amount is missing, ask: 'How much would you like to send?'
		- Only when all required parameters are provided, call 'review_send_tokens'.
		- After review_send_tokens, the UI will handle the final send or cancel action.
			
	- For 'show_contacts':
		- Use when the user specifies a contact name or wants to choose from saved contacts **and there are matching contacts for the token's addressType**.
		- When filtering, always use "addressType" (values: 'Btc', 'Eth', 'Sol', 'Icrcv2') instead of the raw address.
		- Once the tool returns a contact list, do NOT call 'show_contacts' again for the same contact unless explicitly requested.
		- If the user confirms a selection, immediately call 'review_send_tokens' with the selected "addressId" and previously provided "amountNumber" + "tokenSymbol".
	
	MEMORY & CHAINING BEHAVIOR:
	- Always remember values from earlier in the conversation (destination, addressId, amountNumber, tokenSymbol) until the send action is complete.
	- If "show_contacts" was called and the user confirms a specific contact/address, you MUST reuse the "addressId" from the tool result and proceed to "review_send_tokens" without asking for contact info again.
	
	NETWORKID MAPPING TO ADDRESSTYPE:
	- BTC  → "Btc"
	- ICP  → "Icrcv2"
	- SOL  → "Sol"
	- ETH, BASE, BSC, POL → "Eth"
	
	PERSONALITY: 
	- Confident about revolutionary security model, user-focused on seamless experience, honest about alpha status. Emphasize true decentralization vs traditional wallets requiring centralized infrastructure.
	
	ANSWER STYLE: 
	- Concise
	
	AVAILABLE TOKENS:
	${availableTokens}
					
	AVAILABLE CONTACTS:
	${availableContacts}`;

export const getAiAssistantFilterContactsPrompt = (
	filterParams: string
) => `You are a strict semantic filter engine.
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

Arguments: "${filterParams}".

Do NOT include json or any Markdown.
Do NOT include extra text.`;

export const getAiAssistantToolsDescription = (enabledTokensSymbols: string[]) =>
	[
		{
			function: {
				name: 'show_contacts',
				description: toNullable(
					"Retrieve contacts from the user's address book. " +
						'Return ONLY a valid JSON object matching the exact schema below. ' +
						'Do not include any extra commentary, markdown, or text outside the JSON. ' +
						'Ensure the JSON is syntactically complete — all brackets and quotes must be closed.'
				),
				parameters: toNullable({
					type: 'object',
					properties: toNullable([
						{
							type: 'string',
							name: 'searchQuery',
							enum: toNullable(),
							description: toNullable(
								'Optional search term. Can be vague (e.g., "fruit", "crypto").'
							)
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
		},
		{
			function: {
				name: 'review_send_tokens',
				description:
					toNullable(`Display an overview of the pending token transfer for user confirmation. 
				When filling parameters:
				- Assign the numeric amount to "amountNumber" (type: number). Use numerals without quotes (e.g., 10, 0.5).
				- Assign the token symbol (string) to "tokenSymbol".
				- Never assign the token symbol to "amountNumber".
				Correct example: {"addressId":"abc","amountNumber":"10","tokenSymbol":"ICP"}
				Incorrect (never do): {"addressId":"abc","amountNumber":"ICP"}
				Do NOT send tokens yourself; sending will only happen via the UI button.
				There should always be 3 arguments returned: "tokenSymbol", "amountNumber" and either "addressId" or "address".
				If one of those 3 arguments is not available, ask the user to provide it.`),
				parameters: toNullable({
					type: 'object',
					properties: toNullable([
						{
							type: 'string',
							name: 'addressId',
							enum: toNullable(),
							description: toNullable(
								'Unique ID of the address in the user’s contacts. Returned from show_contacts.'
							)
						},
						{
							type: 'string',
							name: 'address',
							enum: toNullable(),
							description: toNullable(
								'Blockchain address to send tokens to if not using a contact.'
							)
						},
						{
							type: 'string',
							name: 'amountNumber',
							enum: toNullable(),
							description: toNullable(
								'Numeric amount to send. Example: "10" for 10 ICP, "0.5" for 0.5 BTC.'
							)
						},
						{
							type: 'string',
							name: 'tokenSymbol',
							enum: toNullable(enabledTokensSymbols),
							description: toNullable(
								"Token symbol or identifier to send. Example: 'ICP', 'BTC', 'ckUSDC'. Must be one of the AVAILABLE TOKENS."
							)
						}
					]),
					required: toNullable(['amountNumber', 'tokenSymbol'])
				})
			}
		}
	] as tool[];

export const MAX_DISPLAYED_ADDRESSES_NUMBER = 4;

export const MAX_SUPPORTED_AI_ASSISTANT_CHAT_LENGTH = 100;
