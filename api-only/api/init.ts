import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './cors-helper';
import { NvmApp, NVMAppEnvironments } from '@nevermined-io/sdk';

async function initHandler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('🔗 Initializing Nevermined SDK...');
    
    // Initialize NvmApp with Base environment
    const app = await NvmApp.getInstance(NVMAppEnvironments.Base);
    
    console.log('✅ Nevermined SDK initialized successfully');
    
    // Test basic connectivity without requiring Web3
    let sdkVersion = 'unknown';
    let hasSDKAccess = false;
    
    try {
      // Try to access SDK, but handle Web3 connection errors gracefully
      if (app.sdk) {
        hasSDKAccess = true;
        sdkVersion = (app.sdk as any)?.version || 'connected';
      }
    } catch (sdkError) {
      console.log('⚠️  SDK access limited (offchain mode):', (sdkError as Error).message);
      hasSDKAccess = false;
    }
    
    // Test connectivity and gather information
    const initResponse = {
      success: true,
      message: 'Nevermined SDK initialized successfully',
      timestamp: new Date().toISOString(),
      environment: NVMAppEnvironments.Base,
      mode: hasSDKAccess ? 'connected' : 'offchain',
      capabilities: {
        search: !!app.search,
        payments: !!(app as any).payments,
        hasSDKAccess
      },
      config: {
        environment: NVMAppEnvironments.Base,
        networkReady: hasSDKAccess,
        searchAvailable: !!app.search,
        paymentsInterface: !!(app as any).payments
      },
      version: sdkVersion,
      status: 'ready',
      notes: hasSDKAccess ? 
        'Full SDK access available' : 
        'Running in offchain mode - limited blockchain functionality'
    };

    console.log('📊 Init response:', {
      success: initResponse.success,
      environment: initResponse.environment,
      mode: initResponse.mode,
      capabilities: initResponse.capabilities
    });

    res.json(initResponse);
    
  } catch (error) {
    console.error('💥 Nevermined SDK initialization failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to initialize Nevermined SDK',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      details: {
        stack: error instanceof Error ? error.stack : undefined,
        code: (error as any)?.code || 'SDK_INIT_ERROR'
      }
    });
  }
}

export default withCors(initHandler); 