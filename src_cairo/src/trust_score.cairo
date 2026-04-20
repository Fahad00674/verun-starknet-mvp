#[starknet::interface]
trait ITrustScore<TContractState> {
    fn record_score(ref self: TContractState, agent_id: felt252, score: u256, timestamp: u64);
    fn get_score(self: @TContractState, agent_id: felt252) -> (u256, u64);
    fn get_owner(self: @TContractState) -> starknet::ContractAddress;
}

#[starknet::contract]
mod TrustScore {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        scores: Map<felt252, u256>,
        timestamps: Map<felt252, u64>,
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ScoreRecorded: ScoreRecorded,
    }

    #[derive(Drop, starknet::Event)]
    struct ScoreRecorded {
        #[key]
        agent_id: felt252,
        score: u256,
        timestamp: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    #[abi(embed_v0)]
    impl TrustScoreImpl of super::ITrustScore<ContractState> {
        fn record_score(ref self: ContractState, agent_id: felt252, score: u256, timestamp: u64) {
            assert(get_caller_address() == self.owner.read(), 'Only owner can record');
            self.scores.write(agent_id, score);
            self.timestamps.write(agent_id, timestamp);
            self.emit(ScoreRecorded { agent_id, score, timestamp });
        }

        fn get_score(self: @ContractState, agent_id: felt252) -> (u256, u64) {
            let score = self.scores.read(agent_id);
            let timestamp = self.timestamps.read(agent_id);
            (score, timestamp)
        }

        fn get_owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }
    }
}
