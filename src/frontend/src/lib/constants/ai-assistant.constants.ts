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
	
	TOOL USAGE RULES:
	- For 'review_send_tokens':
		- Always validate tokenSymbol against the AVAILABLE TOKENS list.
		- Parsing must always happen in this order:
			1. First, always extract a numeric string into "amountNumber". It must contain only a number (e.g., "10", "0.5").
			2. Then, always check if the token string matches one of the AVAILABLE TOKENS exactly before assigning it to "tokenSymbol".
			3. If the token is not in AVAILABLE TOKENS, do not proceed further.
		- Only call when all 4 arguments "amountNumber" (string), "tokenSymbol" (string), "networkId" (string), and either "selectedContactAddressId" (string) or "address" (string) are provided.
		- If any argument is missing, DO NOT call the tool. Instead, explicitly ask the user for the missing value(s).
		- If a tokenSymbol maps to exactly one networkId, automatically assign that networkId without asking the user.  
		- If a tokenSymbol maps to multiple networkIds and networkId is missing, ask: "On which network would you like to send {tokenSymbol}?"  
	
	- For 'show_all_contacts':
		- Call only when no filters are given (e.g. "Show me all contacts").
		- Returns nothing; frontend displays all contacts.

	- For 'show_filtered_contacts':
		- Call only when filters are given (e.g. "Show me my ETH contacts" or when resolving a contact name together with a known token).
		- Return only "addressIds" (addresses[].id) from the user’s contacts. If no matches, return [].

	MEMORY & CHAINING BEHAVIOR:
	- Always remember values from earlier in the conversation (address, selectedContactAddressId, amountNumber, tokenSymbol, networkId) until the send action is complete.
	- If user confirms a contact/address after calling show_all_contacts or show_filtered_contacts tool, that "selectedContactAddressId" will be used for "review_send_tokens" tool after all other arguments are provided by the user.
	
	Network ID → addressType mapping:
	- BTC → Btc
	- ICP → Icrcv2
	- SOL → Sol
	- ETH, BASE, BSC, POL, ARB → Eth
	
	PERSONALITY:
	- Confident about revolutionary security model, user-focused on seamless experience, honest about alpha status. Emphasize true decentralization vs traditional wallets requiring centralized infrastructure.
	
	ANSWER STYLE:
	- Concise
	
	AVAILABLE TOKENS:
	${availableTokens}
					
	AVAILABLE CONTACTS:
	${availableContacts}`;

export const getAiAssistantToolsDescription = ({
	enabledNetworksSymbols,
	enabledTokensSymbols
}: {
	enabledNetworksSymbols: string[];
	enabledTokensSymbols: string[];
}) =>
	[
		{
			function: {
				name: 'show_all_contacts',
				description: toNullable(
					"Show all contacts when no filters are provided (e.g. 'Show me all contacts'). Do not include commentary or extra text."
				),
				parameters: toNullable()
			}
		},
		{
			function: {
				name: 'show_filtered_contacts',
				description: toNullable(
					'Filter the provided contacts list by semantic meaning and return only matching addressIds. Always return only { "addressIds": [...] }. If no matches, return an empty array. Never include any other fields.'
				),
				parameters: toNullable({
					type: 'object',
					properties: toNullable([
						{
							type: 'array',
							name: 'addressIds',
							description: toNullable('Array of matching address IDs.'),
							enum: toNullable()
						}
					]),
					required: toNullable(['addressIds'])
				})
			}
		},
		{
			function: {
				name: 'review_send_tokens',
				description: toNullable(
					`Display a pending token transfer for confirmation. Always return 4 arguments: "amountNumber" (string), "tokenSymbol" (string), "networkId" (string), and either "selectedContactAddressId" (string) or "address" (string). If one of those arguments is not available, ask the user to provide it.`
				),
				parameters: toNullable({
					type: 'object',
					properties: toNullable([
						{
							type: 'string',
							name: 'selectedContactAddressId',
							enum: toNullable(),
							description: toNullable(
								'Unique ID of the specific blockchain address from a contact (addresses[].id).'
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
						},
						{
							type: 'string',
							name: 'networkId',
							enum: toNullable(enabledNetworksSymbols),
							description: toNullable(
								'The blockchain network where the token will be sent (e.g., ETH, BASE, ARB, ICP, SOL, BTC). Must come from AVAILABLE TOKENS.'
							)
						}
					]),
					required: toNullable(['amountNumber', 'tokenSymbol', 'networkId'])
				})
			}
		}
	] as tool[];

export const MAX_SUPPORTED_AI_ASSISTANT_CHAT_LENGTH = 100;
