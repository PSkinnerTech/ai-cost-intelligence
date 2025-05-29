import { VercelRequest, VercelResponse } from '@vercel/node';
import { Nevermined, Logger } from '@nevermined-io/sdk';

let neverminedInstance: Nevermined | null = null;

export async function initializeNevermined(): Promise<Nevermined> {
  if (neverminedInstance) {
    return neverminedInstance;
  }

  try {
    const config = {
      web3ProviderUri: process.env.NEVERMINED_RPC_HOST || 'https://node.base.nevermined.app',
      neverminedNodeUri: process.env.NEVERMINED_NODE_URL || 'https://node.base.nevermined.app',
      marketplaceUri: process.env.NEVERMINED_MARKETPLACE_API_URI || 'https://marketplace-api.base.nevermined.app',
      artifactsFolder: process.env.NEVERMINED_ARTIFACTS_PATH || './node_modules/@nevermined-io/contracts/artifacts/',
    };

    neverminedInstance = await Nevermined.getInstance(config);
    console.log('✅ Nevermined SDK initialized successfully');
    
    return neverminedInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Nevermined SDK:', error);
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const nevermined = await initializeNevermined();
    
    res.json({
      success: true,
      message: 'Nevermined SDK initialized',
      isKeeperConnected: nevermined.isKeeperConnected,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to initialize Nevermined SDK',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 