#[starknet::interface]
trait IValidatorRegistry<TContractState> {
    fn add_validator(ref self: TContractState, name: felt252, weight: u8, validator_type: felt252);
    fn remove_validator(ref self: TContractState, name: felt252);
    fn get_validator(self: @TContractState, name: felt252) -> (u8, felt252, bool);
    fn get_validator_count(self: @TContractState) -> u32;
    fn is_active(self: @TContractState, name: felt252) -> bool;
    fn get_owner(self: @TContractState) -> starknet::ContractAddress;
}

#[starknet::contract]
mod ValidatorRegistry {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        validator_count: u32,
        // name -> weight
        validator_weights: Map<felt252, u8>,
        // name -> type (founding / community)
        validator_types: Map<felt252, felt252>,
        // name -> active flag
        validator_active: Map<felt252, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ValidatorAdded: ValidatorAdded,
        ValidatorRemoved: ValidatorRemoved,
    }

    #[derive(Drop, starknet::Event)]
    struct ValidatorAdded {
        #[key]
        name: felt252,
        weight: u8,
        validator_type: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct ValidatorRemoved {
        #[key]
        name: felt252,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
        // Seed tokenforge as founding validator (weight=2)
        self.validator_weights.write('tokenforge', 2);
        self.validator_types.write('tokenforge', 'founding');
        self.validator_active.write('tokenforge', true);
        self.validator_count.write(1);
    }

    #[abi(embed_v0)]
    impl ValidatorRegistryImpl of super::IValidatorRegistry<ContractState> {
        fn add_validator(ref self: ContractState, name: felt252, weight: u8, validator_type: felt252) {
            assert(get_caller_address() == self.owner.read(), 'Only owner');
            assert(!self.validator_active.read(name), 'Already active');
            self.validator_weights.write(name, weight);
            self.validator_types.write(name, validator_type);
            self.validator_active.write(name, true);
            let count = self.validator_count.read();
            self.validator_count.write(count + 1);
            self.emit(ValidatorAdded { name, weight, validator_type });
        }

        fn remove_validator(ref self: ContractState, name: felt252) {
            assert(get_caller_address() == self.owner.read(), 'Only owner');
            assert(self.validator_active.read(name), 'Not active');
            self.validator_active.write(name, false);
            let count = self.validator_count.read();
            self.validator_count.write(count - 1);
            self.emit(ValidatorRemoved { name });
        }

        fn get_validator(self: @ContractState, name: felt252) -> (u8, felt252, bool) {
            let weight = self.validator_weights.read(name);
            let validator_type = self.validator_types.read(name);
            let active = self.validator_active.read(name);
            (weight, validator_type, active)
        }

        fn get_validator_count(self: @ContractState) -> u32 {
            self.validator_count.read()
        }

        fn is_active(self: @ContractState, name: felt252) -> bool {
            self.validator_active.read(name)
        }

        fn get_owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }
    }
}
