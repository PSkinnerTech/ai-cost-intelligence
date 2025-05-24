// test-dual-destinations.js
// IMPORTANT: Import instrumentation first!
require('../dist/instrumentation');

const { OpenAI } = require('openai');
const { withSession, tracedOperation, getTracer } = require('../dist/instrumentation');

// Wait a moment for instrumentation to initialize
setTimeout(async () => {
  console.log('🧪 Testing Dual Destination Tracing (Phoenix + Arize)...\n');

  // Test 1: Configuration check
  console.log('1️⃣ Checking configuration...');
  console.log('   Phoenix Endpoint:', process.env.PHOENIX_COLLECTOR_ENDPOINT || 'http://localhost:6006');
  console.log('   Arize Space ID:', process.env.ARIZE_SPACE_ID ? '✅ Configured' : '❌ Missing');
  console.log('   Arize API Key:', process.env.ARIZE_API_KEY ? '✅ Configured' : '❌ Missing');
  console.log('   OpenAI API Key:', process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing');

  if (!process.env.ARIZE_SPACE_ID || !process.env.ARIZE_API_KEY) {
    console.log('\n⚠️  Arize credentials missing!');
    console.log('   1. Copy env.template to .env');
    console.log('   2. Add your Arize space_id and api_key from app.arize.com');
    console.log('   3. Run this test again\n');
  }

  // Test 2: OpenAI call with dual tracing (if API key available)
  if (process.env.OPENAI_API_KEY) {
    console.log('\n2️⃣ Testing OpenAI call with dual destinations...');
    try {
      const openai = new OpenAI();
      const sessionId = 'dual-test-session-' + Date.now();
      
      const result = await withSession(sessionId, async () => {
        return tracedOperation('test-dual-destination-call', {
          'test.type': 'dual-destination',
          'test.timestamp': new Date().toISOString(),
          'test.destinations': 'phoenix+arize',
          'session.id': sessionId,
        }, async () => {
          console.log('   📡 Making OpenAI API call...');
          
          const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ 
              role: 'user', 
              content: 'Respond with exactly: "Dual tracing test successful!"' 
            }],
            max_tokens: 20,
            temperature: 0,
          });

          const content = response.choices[0].message.content;
          const tokens = response.usage?.total_tokens;
          
          console.log('   📝 Response:', content);
          console.log('   🔢 Tokens used:', tokens);
          
          return response;
        });
      });
      
      console.log('   ✅ OpenAI call completed - traces sent to both destinations');
      
    } catch (error) {
      console.log('   ❌ OpenAI integration failed:', error.message);
    }
  } else {
    console.log('\n2️⃣ Skipping OpenAI test (no OPENAI_API_KEY found)');
  }

  // Test 3: Connectivity checks
  console.log('\n3️⃣ Testing destination connectivity...');
  
  // Phoenix check
  try {
    const phoenixResponse = await fetch('http://localhost:6006/health');
    if (phoenixResponse.ok) {
      console.log('   ✅ Phoenix: Connected (http://localhost:6006)');
    } else {
      console.log('   ⚠️  Phoenix: Server responded with status:', phoenixResponse.status);
    }
  } catch (error) {
    console.log('   ❌ Phoenix: Connection failed -', error.message);
  }

  // Arize check (basic connectivity - actual authentication tested during trace send)
  if (process.env.ARIZE_SPACE_ID && process.env.ARIZE_API_KEY) {
    console.log('   🌐 Arize: Credentials configured, traces should be sent');
    console.log('   📊 Check your Arize dashboard: https://app.arize.com');
  } else {
    console.log('   ℹ️  Arize: Not configured');
  }

  // Test 4: Manual spans with rich metadata
  console.log('\n4️⃣ Testing manual spans with rich metadata...');
  try {
    const sessionId = 'metadata-test-session-' + Date.now();
    
    await withSession(sessionId, async () => {
      await tracedOperation('test-rich-metadata', {
        'test.type': 'metadata',
        'test.destination': 'dual',
        'session.id': sessionId,
        'custom.attribute': 'test-value',
        'cost.estimation': 0.0001,
        'model.provider': 'openai',
        'model.version': 'gpt-3.5-turbo',
      }, async () => {
        console.log('   ✅ Rich metadata span created');
        await new Promise(resolve => setTimeout(resolve, 100));
      });
    });
  } catch (error) {
    console.log('   ❌ Rich metadata test failed:', error.message);
  }

  console.log('\n🎉 Dual destination test completed!');
  console.log('\n📍 Where to check your traces:');
  console.log('   🔍 Phoenix (Local): http://localhost:6006');
  console.log('   🌐 Arize (Cloud): https://app.arize.com');
  
  if (process.env.ARIZE_SPACE_ID && process.env.ARIZE_API_KEY) {
    console.log('\n✅ Both destinations configured - traces should appear in both UIs');
  } else {
    console.log('\n⚠️  Only Phoenix configured - add Arize credentials for dual destination');
  }
  
  // Give traces time to be sent before exiting
  setTimeout(() => {
    process.exit(0);
  }, 3000);

}, 1000); 