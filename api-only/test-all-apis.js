#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Base URL for your api-only deployment - using the latest deployment with mock APIs
const BASE_URL = 'https://api-only-mmbfaoel0-pskinnertechs-projects.vercel.app';

// List of all API endpoints to test (now including working Nevermined mock APIs)
const endpoints = [
  // Basic working endpoints
  { path: '/api/test', method: 'GET', name: 'Test API' },
  { path: '/api/health', method: 'GET', name: 'Health Check' },
  
  // Nevermined mock endpoints
  { path: '/api/init', method: 'GET', name: 'Nevermined Init (Mock)' },
  { path: '/api/credits', method: 'GET', name: 'Nevermined Credits Balance (Mock)' },
  { path: '/api/credits', method: 'POST', name: 'Nevermined Credits Purchase (Mock)', body: { amount: 100 } },
  { path: '/api/comparison', method: 'GET', name: 'Nevermined Cost Comparison (Mock)' },
  { path: '/api/comparison?volume=50000', method: 'GET', name: 'Nevermined Comparison - Custom Volume (Mock)' },
];

function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Test-Script'
      }
    };

    if (data && method !== 'GET') {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const lib = urlObj.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers, parseError: e.message });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  console.log(`\n🔍 Testing: ${endpoint.name}`);
  console.log(`   ${endpoint.method} ${url}`);
  
  try {
    const result = await makeRequest(url, endpoint.method, endpoint.body);
    
    if (result.status === 200) {
      console.log(`   ✅ SUCCESS (${result.status})`);
      if (typeof result.data === 'object' && result.data !== null) {
        console.log(`   📄 Response:`, JSON.stringify(result.data, null, 2).substring(0, 200) + '...');
      } else {
        console.log(`   📄 Response:`, result.data.substring(0, 200) + '...');
      }
    } else if (result.status === 404) {
      console.log(`   ❌ NOT FOUND (${result.status}) - Endpoint may not be deployed`);
    } else if (result.status >= 400 && result.status < 500) {
      console.log(`   ⚠️  CLIENT ERROR (${result.status})`);
      console.log(`   📄 Error:`, result.data);
    } else if (result.status >= 500) {
      console.log(`   💥 SERVER ERROR (${result.status})`);
      console.log(`   📄 Error:`, result.data);
    } else {
      console.log(`   ℹ️  UNEXPECTED STATUS (${result.status})`);
      console.log(`   📄 Response:`, result.data);
    }
    
    return { endpoint: endpoint.name, status: result.status, success: result.status === 200 };
  } catch (error) {
    console.log(`   💥 REQUEST FAILED: ${error.message}`);
    return { endpoint: endpoint.name, status: 'ERROR', success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Starting API Tests for arize-api-only deployment');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    // Add delay between requests to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Working APIs:');
    successful.forEach(r => console.log(`   - ${r.endpoint}`));
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed APIs:');
    failed.forEach(r => console.log(`   - ${r.endpoint} (${r.status})`));
  }
  
  console.log('\n🎯 Recommendations:');
  if (failed.length === results.length) {
    console.log('   - No APIs are responding. Check deployment status.');
    console.log('   - Verify the base URL is correct.');
    console.log('   - Check Vercel deployment logs.');
  } else if (failed.length > 0) {
    console.log('   - Some APIs are not working. Check individual function deployments.');
    console.log('   - Review function logs in Vercel dashboard.');
    console.log('   - Verify environment variables are set correctly.');
  } else {
    console.log('   - All APIs are working! 🎉');
  }
}

runAllTests().catch(console.error); 