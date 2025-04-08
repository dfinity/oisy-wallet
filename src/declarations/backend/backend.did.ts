import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

// Contact types
export type ContactNetwork = 
  | { Bitcoin: null }
  | { Ethereum: null }
  | { InternetComputer: null }
  | { Solana: null };

export interface Contact {
  address: string;
  alias: string;
  notes: string | null;
  network: ContactNetwork;
  group: string | null;
  is_favorite: boolean;
  last_used: bigint | null;
}

export interface ContactGroup {
  name: string;
  description: string | null;
  icon: string | null;
}

// Request and response types for contact operations
export interface AddContactRequest {
  contact: Contact;
  current_user_version: [] | [bigint];
}

export interface UpdateContactRequest {
  address: string;
  network: ContactNetwork;
  alias: string;
  notes: string | null;
  group: string | null;
  is_favorite: boolean;
  current_user_version: [] | [bigint];
}

export interface DeleteContactRequest {
  address: string;
  network: ContactNetwork;
  current_user_version: [] | [bigint];
}

export interface ToggleContactFavoriteRequest {
  address: string;
  network: ContactNetwork;
  is_favorite: boolean;
  current_user_version: [] | [bigint];
}

export interface AddContactGroupRequest {
  group: ContactGroup;
  current_user_version: [] | [bigint];
}

export interface UpdateContactGroupRequest {
  name: string;
  description: string | null;
  icon: string | null;
  current_user_version: [] | [bigint];
}

export interface DeleteContactGroupRequest {
  name: string;
  current_user_version: [] | [bigint];
}

// Error types
export type ContactError = 
  | { VersionMismatch: null }
  | { UserNotFound: null }
  | { ContactAlreadyExists: null }
  | { ContactNotFound: null }
  | { GroupAlreadyExists: null }
  | { GroupNotFound: null }
  | { GroupInUse: null };

export type Result<T> = { Ok: T } | { Err: ContactError };

// User profile type
export interface UserProfile {
  credentials: Array<UserCredential>;
  version: [] | [bigint];
  settings: [] | [Settings];
  contacts: Array<Contact>;
  contact_groups: Array<ContactGroup>;
  created_timestamp: bigint;
  updated_timestamp: bigint;
}

export interface UserCredential {
  issuer: string;
  verified_date_timestamp: [] | [bigint];
  credential_type: CredentialType;
}

export type CredentialType = { ProofOfUniqueness: null };

export interface Settings {
  networks: NetworksSettings;
  dapp: DappSettings;
}

export interface NetworksSettings {
  networks: Array<[NetworkSettingsFor, NetworkSettings]>;
  testnets: TestnetsSettings;
}

export type NetworkSettingsFor =
  | { InternetComputer: null }
  | { SolanaTestnet: null }
  | { BitcoinRegtest: null }
  | { SolanaDevnet: null }
  | { EthereumSepolia: null }
  | { BitcoinTestnet: null }
  | { SolanaLocal: null }
  | { EthereumMainnet: null }
  | { SolanaMainnet: null }
  | { BitcoinMainnet: null };

export interface NetworkSettings {
  enabled: boolean;
  is_testnet: boolean;
}

export interface TestnetsSettings {
  show_testnets: boolean;
}

export interface DappSettings {
  dapp_carousel: DappCarouselSettings;
}

export interface DappCarouselSettings {
  hidden_dapp_ids: Array<string>;
}

// Service interface
export interface _SERVICE {
  // Contact management
  get_contacts: ActorMethod<[], Array<Contact>>;
  get_contact_groups: ActorMethod<[], Array<ContactGroup>>;
  add_contact: ActorMethod<[AddContactRequest], Result<null>>;
  update_contact: ActorMethod<[UpdateContactRequest], Result<null>>;
  delete_contact: ActorMethod<[DeleteContactRequest], Result<null>>;
  toggle_contact_favorite: ActorMethod<[ToggleContactFavoriteRequest], Result<null>>;
  add_contact_group: ActorMethod<[AddContactGroupRequest], Result<null>>;
  update_contact_group: ActorMethod<[UpdateContactGroupRequest], Result<null>>;
  delete_contact_group: ActorMethod<[DeleteContactGroupRequest], Result<null>>;
  
  // User profile
  get_user_profile: ActorMethod<[], Result<UserProfile>>;
  create_user_profile: ActorMethod<[], UserProfile>;
}

export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];