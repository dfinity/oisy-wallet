import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";

module {
    // Network type for contacts
    public type ContactNetwork = {
        #Ethereum;
        #Bitcoin;
        #InternetComputer;
        #Solana;
        #Base;
        #BNB;
        #Avalanche;
        #Polygon;
    };

    // Contact data structure
    public type Contact = {
        address: Text;
        alias: Text;
        network: ContactNetwork;
        notes: ?Text;
        group: ?Text;
        is_favorite: Bool;
        last_used: ?Time.Time;
    };

    // Input for adding a new contact
    public type AddContactInput = {
        contact: Contact;
    };

    // Input for updating a contact
    public type UpdateContactInput = {
        address: Text;
        network: ContactNetwork;
        alias: Text;
        notes: ?Text;
        group: ?Text;
        isFavorite: Bool;
    };

    // Input for deleting a contact
    public type DeleteContactInput = {
        address: Text;
        network: ContactNetwork;
    };

    // Input for toggling favorite status
    public type ToggleFavoriteInput = {
        address: Text;
        network: ContactNetwork;
        isFavorite: Bool;
    };

    // Error types for contact operations
    public type ContactError = {
        #NotFound;
        #AlreadyExists;
        #InvalidAddress;
        #Unauthorized;
        #LimitExceeded;
        #Other: Text;
    };

    // Result types for contact operations
    public type ContactResult<T> = {
        #Ok: T;
        #Err: ContactError;
    };

    // Contact store for a user
    public type ContactStore = {
        contacts: HashMap.HashMap<Text, Contact>;
    };

    // Generate a unique key for a contact based on address and network
    public func generateContactKey(address: Text, network: ContactNetwork): Text {
        let networkText = switch (network) {
            case (#Ethereum) "ethereum";
            case (#Bitcoin) "bitcoin";
            case (#InternetComputer) "internetcomputer";
            case (#Solana) "solana";
            case (#Base) "base";
            case (#BNB) "bnb";
            case (#Avalanche) "avalanche";
            case (#Polygon) "polygon";
        };
        
        return networkText # ":" # address;
    };
}