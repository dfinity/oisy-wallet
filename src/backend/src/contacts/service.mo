import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Store "store";
import Types "types";

module {
    // User contacts map: Principal -> ContactStore
    private var userContacts = HashMap.HashMap<Principal, Types.ContactStore>(16, Principal.equal, Principal.hash);

    // Get or create a contact store for a user
    private func getOrCreateContactStore(user: Principal): Types.ContactStore {
        switch (userContacts.get(user)) {
            case (?store) {
                store
            };
            case (null) {
                let newStore = Store.createContactStore();
                userContacts.put(user, newStore);
                newStore
            };
        }
    };

    // Add a contact for a user
    public func addContact(
        user: Principal, 
        input: Types.AddContactInput
    ): Result.Result<(), Types.ContactError> {
        let store = getOrCreateContactStore(user);
        
        switch (Store.addContact(store, input)) {
            case (#Ok(_)) {
                #ok(())
            };
            case (#Err(error)) {
                #err(error)
            };
        }
    };

    // Update a contact for a user
    public func updateContact(
        user: Principal, 
        input: Types.UpdateContactInput
    ): Result.Result<(), Types.ContactError> {
        switch (userContacts.get(user)) {
            case (null) {
                #err(#NotFound)
            };
            case (?store) {
                switch (Store.updateContact(store, input)) {
                    case (#Ok(_)) {
                        #ok(())
                    };
                    case (#Err(error)) {
                        #err(error)
                    };
                }
            };
        }
    };

    // Delete a contact for a user
    public func deleteContact(
        user: Principal, 
        input: Types.DeleteContactInput
    ): Result.Result<(), Types.ContactError> {
        switch (userContacts.get(user)) {
            case (null) {
                #err(#NotFound)
            };
            case (?store) {
                switch (Store.deleteContact(store, input)) {
                    case (#Ok(_)) {
                        #ok(())
                    };
                    case (#Err(error)) {
                        #err(error)
                    };
                }
            };
        }
    };

    // Toggle favorite status for a contact
    public func toggleFavorite(
        user: Principal, 
        input: Types.ToggleFavoriteInput
    ): Result.Result<(), Types.ContactError> {
        switch (userContacts.get(user)) {
            case (null) {
                #err(#NotFound)
            };
            case (?store) {
                switch (Store.toggleFavorite(store, input)) {
                    case (#Ok(_)) {
                        #ok(())
                    };
                    case (#Err(error)) {
                        #err(error)
                    };
                }
            };
        }
    };

    // Get all contacts for a user
    public func getContacts(user: Principal): [Types.Contact] {
        switch (userContacts.get(user)) {
            case (null) {
                []
            };
            case (?store) {
                Store.getContacts(store)
            };
        }
    };

    // Update last used timestamp for a contact
    public func updateLastUsed(
        user: Principal, 
        address: Text, 
        network: Types.ContactNetwork
    ): Result.Result<(), Types.ContactError> {
        switch (userContacts.get(user)) {
            case (null) {
                #err(#NotFound)
            };
            case (?store) {
                switch (Store.updateLastUsed(store, address, network)) {
                    case (#Ok(_)) {
                        #ok(())
                    };
                    case (#Err(error)) {
                        #err(error)
                    };
                }
            };
        }
    };
}