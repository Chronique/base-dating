// src/constants.ts
export const CONTRACT_ADDRESS = "0x3C5F31E167bA64Bc693B4d32517e2f81d61Bc64A"; 

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