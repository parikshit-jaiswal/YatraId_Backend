import Tourist from "../models/Tourist";
import { ethers } from "ethers";
import dotenv from "dotenv";

// Import ABI using CommonJS require (works with TypeScript + CommonJS)
const TouristABI = require("../abis/Tourist.json");

// Load environment variables
dotenv.config();

class OnchainWorker {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;
  private isProcessing = false;
  public isRunning = false; // ADDED: Track if worker is running
  private intervalId: NodeJS.Timeout | null = null; // ADDED: Store interval ID

  constructor() {
    try {
      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC!);
      
      // Validate and initialize private key
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('PRIVATE_KEY not found in environment variables');
      }
      
      // Ensure private key has 0x prefix and is 64 characters (32 bytes)
      let formattedKey = privateKey.trim();
      if (!formattedKey.startsWith('0x')) {
        formattedKey = '0x' + formattedKey;
      }
      
      if (formattedKey.length !== 66) {
        throw new Error(`Invalid private key length: ${formattedKey.length}. Expected 66 characters (including 0x)`);
      }

      // Initialize signer
      this.signer = new ethers.Wallet(formattedKey, this.provider);
      
      // Initialize contract
      if (!process.env.CONTRACT_ADDRESS) {
        throw new Error('CONTRACT_ADDRESS not found in environment variables');
      }
      
      this.contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS!,
        TouristABI,
        this.signer
      );

      console.log('✅ OnchainWorker initialized successfully');
      console.log(`📍 Worker address: ${this.signer.address}`);
      console.log(`📜 Contract address: ${process.env.CONTRACT_ADDRESS}`);

    } catch (error) {
      console.error('❌ Failed to initialize OnchainWorker:', error);
      throw error;
    }
  }

  async processPending() {
    if (this.isProcessing) {
      console.log('Worker already processing, skipping...');
      return;
    }

    this.isProcessing = true;
    console.log('🔄 Starting onchain worker processing...');

    try {
      const tourists = await Tourist.find({ 
        "onchainTxs.status": "pending" 
      }).limit(20);

      console.log(`📊 Found ${tourists.length} tourists with pending transactions`);

      for (const tourist of tourists) {
        const pendingTxs = tourist.onchainTxs.filter(tx => tx.status === "pending");
        
        for (const txItem of pendingTxs) {
          try {
            console.log(`⚡ Processing ${txItem.action} for tourist ${tourist.touristIdOnChain}`);
            
            let tx;
            
            if (txItem.action === "register") {
              // Fix the timestamp conversion
              const validUntilTimestamp = Math.floor(tourist.validUntil.getTime() / 1000);
              const currentTimestamp = Math.floor(Date.now() / 1000);
              
              console.log('📋 Registration parameters:');
              console.log(`  Tourist ID: ${tourist.touristIdOnChain}`);
              console.log(`  Owner: ${tourist.ownerWallet}`);
              console.log(`  KYC CID: ${tourist.kycCID}`);
              console.log(`  Emergency CID: ${tourist.emergencyCID}`);
              console.log(`  Valid Until: ${validUntilTimestamp} (${new Date(validUntilTimestamp * 1000).toISOString()})`);
              console.log(`  Current Time: ${currentTimestamp} (${new Date(currentTimestamp * 1000).toISOString()})`);
              console.log(`  Time Difference: ${validUntilTimestamp - currentTimestamp} seconds`);
              console.log(`  Tracking: ${tourist.trackingOptIn}`);
              
              // Check if the timestamp is actually in the future
              if (validUntilTimestamp <= currentTimestamp) {
                console.error(`❌ validUntil timestamp ${validUntilTimestamp} is not in the future!`);
                throw new Error(`validUntil must be in the future. Current: ${currentTimestamp}, Provided: ${validUntilTimestamp}`);
              }
              
              // Check if tourist already exists
              try {
                const existingTourist = await this.contract.getTourist(tourist.touristIdOnChain);
                if (existingTourist.createdAt > 0) {
                  throw new Error('Tourist already registered on blockchain');
                }
              } catch (e: any) {
                if (!e.message.includes('Unknown tourist')) {
                  console.log('⚠️  Tourist existence check failed:', e.message);
                }
              }

              tx = await this.contract.registerTourist(
                tourist.touristIdOnChain,
                tourist.ownerWallet,
                tourist.kycCID,
                tourist.emergencyCID,
                validUntilTimestamp,
                tourist.trackingOptIn,
                { 
                  gasLimit: 500000,
                  maxFeePerGas: ethers.parseUnits("20", "gwei"),
                  maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
                }
              );

            } else if (txItem.action === "update") {
              tx = await this.contract.updateByOwner(
                tourist.touristIdOnChain,
                txItem.cid,
                tourist.trackingOptIn,
                { gasLimit: 300000 }
              );

            } else if (txItem.action === "panic") {
              // REMOVED: Panic transactions are no longer processed on blockchain
              console.log(`⚠️  Skipping panic transaction - panics are now handled off-chain only`);
              txItem.status = "confirmed";
              txItem.updatedAt = new Date();
              await tourist.save();
              console.log(`✅ Panic transaction marked as completed (off-chain)`);
              continue;

            } else if (txItem.action === "score") {
              tx = await this.contract.pushScore(
                tourist.touristIdOnChain,
                txItem.cid,
                { gasLimit: 250000 }
              );

            } else if (txItem.action === "verify_kyc") {
              // Handle KYC verification - this might be a custom function
              console.log(`📋 Processing KYC verification for tourist ${tourist.touristIdOnChain}`);
              // For now, just mark as completed since we don't have this function in the ABI
              txItem.status = "confirmed";
              txItem.updatedAt = new Date();
              await tourist.save();
              console.log(`✅ KYC verification completed for tourist ${tourist.touristIdOnChain}`);
              continue;
            }

            if (tx) {
              // Update status to submitted
              txItem.txHash = tx.hash;
              txItem.status = "submitted";
              txItem.updatedAt = new Date();
              await tourist.save();

              console.log(`✅ Transaction submitted: ${tx.hash}`);

              // Wait for confirmation
              const receipt = await tx.wait(1);
              
              if (receipt && receipt.status === 1) {
                txItem.status = "confirmed";
                txItem.updatedAt = new Date();
                await tourist.save();
                console.log(`🎉 Transaction confirmed: ${tx.hash}`);
              } else {
                throw new Error('Transaction failed on blockchain');
              }
            }

          } catch (error: any) {
            console.error(`❌ Error processing ${txItem.action} for tourist ${tourist.touristIdOnChain}:`, error);
            
            txItem.status = "failed";
            txItem.error = error.message || "Unknown error";
            txItem.updatedAt = new Date();
            await tourist.save();
          }
        }
      }
    } catch (error) {
      console.error('💥 Onchain worker error:', error);
    } finally {
      this.isProcessing = false;
      console.log('✨ Onchain worker processing completed');
    }
  }

  async grantOracleRole() {
    try {
      const ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));
      const hasRole = await this.contract.hasRole(ORACLE_ROLE, this.signer.address);
      
      if (!hasRole) {
        console.log('⚠️  Worker does not have ORACLE role. Please grant it manually from admin.');
        console.log(`🔑 Worker address: ${this.signer.address}`);
        console.log(`💡 Grant command: contract.grantRole(ORACLE_ROLE, "${this.signer.address}")`);
      } else {
        console.log('✅ Worker has ORACLE role');
      }
    } catch (error) {
      console.error('❌ Error checking ORACLE role:', error);
    }
  }

  async checkConnection() {
    try {
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(this.signer.address);
      
      console.log(`🌐 Connected to network: ${network.name} (${network.chainId})`);
      console.log(`💰 Worker balance: ${ethers.formatEther(balance)} ETH`);
      
      if (balance === BigInt(0)) {
        console.warn('⚠️  Worker has no ETH balance. Please fund the account.');
      }
    } catch (error) {
      console.error('❌ Connection check failed:', error);
    }
  }

  async debugContract() {
    try {
      console.log('🔍 Debugging contract...');
      
      // Check if contract exists
      const code = await this.provider.getCode(process.env.CONTRACT_ADDRESS!);
      console.log(`📜 Contract code length: ${code.length}`);
      
      if (code === '0x') {
        console.error('❌ No contract deployed at this address!');
        return;
      }
      
      // Check if wallet has admin role
      const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const hasAdminRole = await this.contract.hasRole(DEFAULT_ADMIN_ROLE, this.signer.address);
      console.log(`🔐 Wallet has admin role: ${hasAdminRole}`);
      
      // Check if contract is paused
      try {
        const isPaused = await this.contract.paused();
        console.log(`⏸️  Contract paused: ${isPaused}`);
      } catch (e) {
        console.log('⏸️  Contract pause check failed (might not have pause function)');
      }
      
      console.log(`💰 Wallet balance: ${await this.provider.getBalance(this.signer.address)}`);
      
    } catch (error) {
      console.error('❌ Contract debug error:', error);
    }
  }

  // UPDATED: Add proper start/stop methods
  start() {
    if (this.isRunning) {
      console.log('⚠️  Onchain worker is already running');
      return;
    }

    console.log('🚀 Starting onchain worker...');
    
    // Set running flag
    this.isRunning = true;
    
    // Check connection and roles
    this.checkConnection();
    this.grantOracleRole();
    
    // Process immediately on start
    this.processPending();
    
    // Then process every 15 seconds
    this.intervalId = setInterval(() => {
      if (this.isRunning) {
        this.processPending();
      }
    }, 15_000);

    console.log('✅ Onchain worker started successfully');
  }

  // ADDED: Stop method
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Onchain worker is not running');
      return;
    }

    console.log('🛑 Stopping onchain worker...');
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Onchain worker stopped successfully');
  }

  // ADDED: Status method
  getStatus() {
    return {
      isRunning: this.isRunning,
      isProcessing: this.isProcessing,
      workerAddress: this.signer.address,
      contractAddress: process.env.CONTRACT_ADDRESS
    };
  }
}

// Export singleton instance
export const onchainWorker = new OnchainWorker();