// src/constants.ts
export const CONTRACT_ADDRESS = "0x66e96ceF7d5EB4016739C34d49FB633276aB075a"; 

export const DATING_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user1", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "user2", "type": "address" }
    ],
    "name": "NewMatch",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "address[]", "name": "targets", "type": "address[]" },
      { "internalType": "bool[]", "name": "likedStatus", "type": "bool[]" }
    ],
    "name": "batchSwipe",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;