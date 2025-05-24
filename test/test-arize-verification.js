// test-arize-verification.js
// Specific test to verify traces are reaching Arize
require('../dist/instrumentation');

const { OpenAI } = require('openai');
const { withSession, tracedOperation } = require('../dist/instrumentation');

setTimeout(async () => {
  console.log('🎯 Arize Trace Verification Test\n');
  
  const timestamp = new Date().toISOString();
  const testId = `arize-verification-${Date.now()}`;
  
  console.log('📊 Test Details:');
  console.log(`   Test ID: ${testId}`);
  console.log(`   Timestamp: ${timestamp}`);
  console.log(`   Model ID: ${process.env.ARIZE_MODEL_ID || 'ab-testing-gui'}`);
  console.log(`   Model Version: ${process.env.ARIZE_MODEL_VERSION || '1.0.0'}`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OpenAI API key required for this test');
    return;
  }

  try {
    console.log('\n📡 Sending test traces to both Phoenix and Arize...');
    
    const openai = new OpenAI();
    const sessionId = `arize-test-session-${Date.now()}`;
    
    // Send 3 different traces with clear identifiers
    for (let i = 1; i <= 3; i++) {
      console.log(`\n🧪 Sending trace ${i}/3...`);
      
      const result = await withSession(sessionId, async () => {
        return tracedOperation(`arize-verification-trace-${i}`, {
          // Clear identifiers for finding in Arize
          'test.arize.verification': true,
          'test.id': testId,
          'test.trace.number': i,
          'test.timestamp': timestamp,
          'test.session': sessionId,
          
          // Additional metadata
          'custom.environment': 'validation',
          'custom.purpose': 'arize-connectivity-test',
          'model.provider': 'openai',
          'trace.sequence': `${i}-of-3`,
        }, async () => {
          const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ 
              role: 'user', 
              content: `This is Arize verification test ${i}/3. Respond with: "Arize test ${i} successful!"` 
            }],
            max_tokens: 15,
            temperature: 0,
          });

          const content = response.choices[0].message.content;
          const tokens = response.usage?.total_tokens;
          
          console.log(`   ✅ Response: ${content}`);
          console.log(`   🔢 Tokens: ${tokens}`);
          
          return response;
        });
      });
    }
    
    console.log('\n🎉 All test traces sent successfully!');
    
    console.log('\n📍 How to Find These Traces in Arize:');
    console.log('1. Go to https://app.arize.com');
    console.log(`2. Look for model: "${process.env.ARIZE_MODEL_ID || 'ab-testing-gui'}"`);
    console.log(`3. Set date range to include: ${new Date().toLocaleDateString()}`);
    console.log('4. Search for these identifiers:');
    console.log(`   • test.id: "${testId}"`);
    console.log(`   • test.arize.verification: true`);
    console.log(`   • session.id: "${sessionId}"`);
    console.log(`   • test.timestamp: "${timestamp}"`);
    
    console.log('\n⏱️  Timing Expectations:');
    console.log('   • Phoenix: Immediate (check http://localhost:6006)');
    console.log('   • Arize: 2-5 minutes (be patient!)');
    
    console.log('\n🔍 Troubleshooting if traces don\'t appear in Arize:');
    console.log('   1. Check date/time filters in Arize dashboard');
    console.log('   2. Verify you\'re looking at the correct model/version');
    console.log('   3. Try broader search terms or remove filters');
    console.log('   4. Contact Arize support with the test ID above');
    
    // Keep the process alive longer to ensure traces are sent
    console.log('\n⏳ Waiting 10 seconds to ensure traces are fully sent...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log('✅ Complete! Check both dashboards now.');
    
  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
  }
  
  process.exit(0);
}, 1000); 