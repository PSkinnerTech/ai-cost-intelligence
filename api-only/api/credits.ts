import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './cors-helper';
import { NvmApp, NVMAppEnvironments } from '@nevermined-io/sdk';

async function creditsHandler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      console.log('💰 Fetching credit balance from Nevermined...');
      
      // Initialize NvmApp
      const app = await NvmApp.getInstance(NVMAppEnvironments.Base);
      
      // For now, we'll simulate reading from search/marketplace
      // This demonstrates real SDK connectivity without requiring a wallet
      let balance = 0;
      let balanceSource = 'default';
      
      try {
        // Try to use search functionality to demonstrate real API connectivity
        if (app.search) {
          console.log('🔍 Testing marketplace connectivity...');
          
          // Use an empty query object that's compatible with SearchQuery interface
          const searchResult = await app.search.query({});
          
          // If search works, we have marketplace connectivity
          // In a real implementation, this would query actual credit plans
          if (searchResult) {
            balanceSource = 'marketplace-connected';
            // Simulate a balance based on connectivity success
            balance = 1000.5; // Demo balance when connected
            console.log('✅ Marketplace connectivity confirmed');
          }
        }
      } catch (searchError) {
        console.log('⚠️  Marketplace query failed:', (searchError as Error).message);
        balanceSource = 'fallback';
        balance = 500.0; // Fallback balance
      }
      
      const creditBalance = {
        success: true,
        balance,
        currency: 'USDC',
        source: balanceSource,
        address: '0x1234567890123456789012345678901234567890', // Placeholder
        timestamp: new Date().toISOString(),
        network: 'base',
        notes: balanceSource === 'marketplace-connected' 
          ? 'Connected to Nevermined marketplace API' 
          : 'Using fallback balance (marketplace connection limited)'
      };
      
      console.log('📊 Credit balance response:', {
        success: creditBalance.success,
        balance: creditBalance.balance,
        source: creditBalance.source
      });
      
      res.json(creditBalance);
      
    } else if (req.method === 'POST') {
      console.log('💳 Processing credit purchase request...');
      
      const { amount } = req.body;
      
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid amount specified',
          details: 'Amount must be a positive number'
        });
        return;
      }

      // Initialize NvmApp for purchase simulation
      const app = await NvmApp.getInstance(NVMAppEnvironments.Base);
      
      // Simulate credit purchase with real SDK context
      // In full implementation, this would create actual payment plans
      const purchase = {
        success: true,
        message: `Credit purchase initialized for ${amount} USDC`,
        transaction: {
          id: `nvm_tx_${Date.now()}`,
          amount,
          currency: 'USDC',
          status: 'simulated', // Would be 'pending' for real transactions
          timestamp: new Date().toISOString(),
          network: 'base'
        },
        newBalance: 1000.5 + amount,
        notes: 'Simulated purchase - real implementation requires wallet connection',
        estimatedCredits: Math.floor(amount * 20), // Assuming 20 credits per USDC
        environment: NVMAppEnvironments.Base
      };
      
      console.log('📊 Purchase response:', {
        success: purchase.success,
        amount: purchase.transaction.amount,
        estimatedCredits: purchase.estimatedCredits
      });
      
      res.json(purchase);
      
    } else {
      res.status(405).json({
        success: false,
        error: 'Method not allowed',
        allowedMethods: ['GET', 'POST']
      });
    }
  } catch (error) {
    console.error('💥 Credits API error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to process credits request',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      details: {
        stack: error instanceof Error ? error.stack : undefined,
        code: (error as any)?.code || 'CREDITS_API_ERROR'
      }
    });
  }
}

export default withCors(creditsHandler); 