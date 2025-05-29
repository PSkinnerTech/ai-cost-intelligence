import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeNevermined } from './init';

// Mock user plan DID for development - replace with actual user management
const MOCK_USER_PLAN_DID = process.env.NEVERMINED_PRICING_PLAN_DID || 'did:nv:3a5580876c5372b84994de6848c5f33e354c26adfc6e44eca6a1dfed03028152';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { method } = req;

    switch (method) {
      case 'GET':
        return await handleGetBalance(req, res);
      case 'POST':
        return await handlePurchaseCredits(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ success: false, error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Credits API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGetBalance(req: VercelRequest, res: VercelResponse) {
  const { planDID = MOCK_USER_PLAN_DID } = req.query;

  try {
    const nevermined = await initializeNevermined();
    
    // For now, return mock data since we need actual plan setup
    // In production, this would be: const balance = await nevermined.agreements.getPlanBalance(planDID);
    const mockBalance = {
      planDID: planDID as string,
      balance: 2500,
      totalCredits: 3000,
      usedCredits: 500,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: mockBalance
    });
  } catch (error) {
    console.error('Failed to get credit balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get credit balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handlePurchaseCredits(req: VercelRequest, res: VercelResponse) {
  const { amount, planDID = MOCK_USER_PLAN_DID } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid amount. Amount must be a positive number.'
    });
  }

  try {
    const nevermined = await initializeNevermined();
    
    // Mock credit purchase - in production this would interact with Nevermined payments
    const purchase = {
      planDID: planDID as string,
      credits: amount,
      cost: amount * 0.00005, // $0.05 per 1000 credits
      transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    res.json({
      success: true,
      data: purchase,
      message: `Successfully purchased ${amount} credits`
    });
  } catch (error) {
    console.error('Failed to purchase credits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to purchase credits',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 