// utils/ipfs.ts
import axios from 'axios';

// Mock IPFS storage for testing (in-memory)
interface MockIPFSStorage {
  [cid: string]: string;
}

// Global storage simulation
declare global {
  var mockIPFSStorage: MockIPFSStorage;
}

global.mockIPFSStorage = global.mockIPFSStorage || {};

// Generate a mock CID that looks like real IPFS CID
function generateMockCID(data: string): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  // IPFS CIDs usually start with 'Qm' for SHA-256 hashes
  return `Qm${hash.substring(0, 44)}`;
}

export async function uploadToIPFS(data: string): Promise<string> {
  try {
    console.log('📁 Uploading to mock IPFS storage...');
    
    // Generate mock CID
    const cid = generateMockCID(data);
    
    // Store in global mock storage
    global.mockIPFSStorage[cid] = data;
    
    console.log(`✅ Mock IPFS upload successful. CID: ${cid}`);
    console.log(`📊 Data size: ${data.length} bytes`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return cid;
    
  } catch (error: any) {
    console.error('❌ Mock IPFS upload error:', error.message);
    throw new Error('Failed to upload to IPFS');
  }
}

export async function getFromIPFS(cid: string): Promise<string> {
  try {
    console.log(`📥 Fetching from mock IPFS storage: ${cid}`);
    
    // Retrieve from global mock storage
    const data = global.mockIPFSStorage[cid];
    
    if (!data) {
      throw new Error(`Data not found for CID: ${cid}`);
    }
    
    console.log(`✅ Mock IPFS fetch successful. Data size: ${data.length} bytes`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return data;
    
  } catch (error: any) {
    console.error('❌ Mock IPFS fetch error:', error.message);
    throw new Error(`Failed to fetch from IPFS: ${error.message}`);
  }
}

// Utility function to list all stored CIDs (for debugging)
export function listStoredCIDs(): string[] {
  return Object.keys(global.mockIPFSStorage || {});
}

// Utility function to clear all stored data (for testing)
export function clearMockStorage(): void {
  global.mockIPFSStorage = {};
  console.log('🗑️  Mock IPFS storage cleared');
}

// Keep old function names for backward compatibility
export const uploadEncryptedToIPFS = uploadToIPFS;
export const fetchFromIPFS = getFromIPFS;

// For production, here are free alternatives:

/*
// OPTION 1: Pinata (Free tier: 1GB storage, 100GB bandwidth)
export async function uploadToPinata(data: string): Promise<string> {
  const PINATA_API_KEY = process.env.PINATA_API_KEY;
  const PINATA_SECRET = process.env.PINATA_SECRET;
  
  const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    pinataContent: data
  }, {
    headers: {
      'pinata_api_key': PINATA_API_KEY,
      'pinata_secret_api_key': PINATA_SECRET
    }
  });
  
  return response.data.IpfsHash;
}

// OPTION 2: Web3.Storage (Free: Unlimited storage)
export async function uploadToWeb3Storage(data: string): Promise<string> {
  const API_TOKEN = process.env.WEB3_STORAGE_TOKEN;
  
  const response = await axios.post('https://api.web3.storage/upload', data, {
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.cid;
}

// OPTION 3: NFT.Storage (Free: Unlimited for NFT data)
export async function uploadToNFTStorage(data: string): Promise<string> {
  const API_TOKEN = process.env.NFT_STORAGE_TOKEN;
  
  const response = await axios.post('https://api.nft.storage/upload', data, {
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.value.cid;
}
*/

console.log('📋 IPFS Utils loaded with Mock Storage');
console.log('💡 For production, consider: Pinata, Web3.Storage, or NFT.Storage');
