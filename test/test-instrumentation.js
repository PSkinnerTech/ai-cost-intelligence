// test-instrumentation.js
// IMPORTANT: Import instrumentation first!
require('../dist/instrumentation');

const { OpenAI } = require('openai');
const { withSession, tracedOperation, getTracer } = require('../dist/instrumentation');

// Wait a moment for instrumentation to initialize
setTimeout(async () => {
  console.log('🧪 Testing OpenTelemetry Instrumentation with Phoenix...\n');

  // Test 1: Check if tracer is available
  console.log('1️⃣ Testing tracer availability...');
  try {
    const tracer = getTracer();
    console.log('   ✅ Tracer created successfully');
  } catch (error) {
    console.log('   ❌ Tracer creation failed:', error.message);
    return;
  }

  // Test 2: Manual span creation
  console.log('\n2️⃣ Testing manual span creation...');
  try {
    await tracedOperation('test-manual-span', {
      'test.type': 'manual',
      'test.timestamp': new Date().toISOString(),
    }, async () => {
      console.log('   ✅ Manual span created');
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'test-result';
    });
  } catch (error) {
    console.log('   ❌ Manual span creation failed:', error.message);
  }

  // Test 3: Session management
  console.log('\n3️⃣ Testing session management...');
  try {
    const sessionId = 'test-session-' + Date.now();
    await withSession(sessionId, async () => {
      await tracedOperation('test-session-span', {
        'test.session': sessionId,
      }, async () => {
        console.log('   ✅ Session span created with ID:', sessionId);
      });
    });
  } catch (error) {
    console.log('   ❌ Session management failed:', error.message);
  }

  // Test 4: OpenAI integration (only if API key is available)
  if (process.env.OPENAI_API_KEY) {
    console.log('\n4️⃣ Testing OpenAI integration...');
    try {
      const openai = new OpenAI();
      
      const sessionId = 'openai-test-session-' + Date.now();
      
      const result = await withSession(sessionId, async () => {
        return tracedOperation('test-openai-call', {
          'test.type': 'openai',
          'prompt.name': 'test-prompt',
        }, async () => {
          console.log('   📡 Making OpenAI API call...');
          
          const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Say "Hello Phoenix!" in exactly 3 words.' }],
            max_tokens: 10,
            temperature: 0,
          });

          console.log('   📝 Response:', response.choices[0].message.content);
          console.log('   🔢 Tokens used:', response.usage?.total_tokens || 'unknown');
          
          return response;
        });
      });
      
      console.log('   ✅ OpenAI call completed successfully');
      
    } catch (error) {
      console.log('   ❌ OpenAI integration failed:', error.message);
    }
  } else {
    console.log('\n4️⃣ Skipping OpenAI test (no OPENAI_API_KEY found)');
    console.log('   ℹ️  Add OPENAI_API_KEY to .env to test OpenAI integration');
  }

  // Test 5: Phoenix connectivity check
  console.log('\n5️⃣ Testing Phoenix connectivity...');
  try {
    const response = await fetch('http://localhost:6006/health');
    if (response.ok) {
      console.log('   ✅ Phoenix server is reachable');
      console.log('   🌐 Visit http://localhost:6006 to view traces');
    } else {
      console.log('   ⚠️  Phoenix server responded with status:', response.status);
    }
  } catch (error) {
    console.log('   ❌ Phoenix connectivity failed:', error.message);
    console.log('   ℹ️  Make sure Phoenix is running: phoenix serve');
  }

  console.log('\n🎉 Test completed! Check Phoenix UI for traces...');
  console.log('📊 Phoenix Dashboard: http://localhost:6006');
  
  // Give traces time to be sent before exiting
  setTimeout(() => {
    process.exit(0);
  }, 2000);

}, 1000); 