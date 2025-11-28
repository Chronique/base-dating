// src/constants.ts

// 👇 Tempel alamat kontrak kamu di sini (contoh: "0x123abc...")
export const CONTRACT_ADDRESS = "0x3C5F31E167bA64Bc693B4d32517e2f81d61Bc64A"; 

// ABI = Kamus agar frontend mengerti fungsi 'swipe' di smart contract
export const DATING_ABI = [
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
  {
    "inputs": [
      { "internalType": "uint256", "name": "targetFid", "type": "uint256" },
      { "internalType": "bool", "name": "liked", "type": "bool" }
    ],
    "name": "swipe",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;