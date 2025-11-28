export const CONTRACT_ADDRESS = "0xbDFCa58D5BEe898da74e17847E9870380708d049"; 

export const DATING_ABI = [
  // ... Event Swiped lama ...
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "targetFid", "type": "uint256" },
      { "indexed": false, "internalType": "bool", "name": "liked", "type": "bool" }
    ],
    "name": "Swiped",
    "type": "event"
  },
  // 👇 FUNGSI BARU INI WAJIB ADA
  {
    "inputs": [
      { "internalType": "uint256[]", "name": "targetFids", "type": "uint256[]" },
      { "internalType": "bool[]", "name": "likeds", "type": "bool[]" }
    ],
    "name": "batchSwipe",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;