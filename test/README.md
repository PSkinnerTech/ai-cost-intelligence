# 🧪 A/B Testing GUI - Test Suite

This folder contains all test files for the A/B Testing GUI project, organized for easy maintenance and execution.

## 📁 Test Files Overview

### Core Tests
| File | Purpose | Description |
|------|---------|-------------|
| `test-environment.js` | Environment validation | Tests API keys, environment variables, and service connectivity |
| `test-instrumentation.js` | OpenTelemetry setup | Validates tracing configuration and Phoenix connectivity |
| `test-api-endpoints.js` | Backend API testing | Comprehensive API endpoint testing (9 test suites) |
| `test-dual-destinations.js` | Dual tracing | Tests Phoenix + Arize integration |
| `test-arize-verification.js` | Arize verification | Specific verification that traces reach Arize cloud |

### Test Runner
| File | Purpose | Description |
|------|---------|-------------|
| `run-tests.js` | Test runner | Convenient script to run individual tests or full test suite |

## 🚀 Quick Start

### Run Individual Tests
```bash
# Environment validation
node test/run-tests.js env

# API endpoint testing  
node test/run-tests.js api

# OpenTelemetry instrumentation
node test/run-tests.js instrumentation

# Dual destination tracing
node test/run-tests.js dual

# Arize verification
node test/run-tests.js arize
```

### Run All Tests
```bash
# Run complete test suite
node test/run-tests.js all
```

### Show Available Tests
```bash
# Display help and available tests
node test/run-tests.js
```

## 📊 Test Categories

### 1. **Environment Tests** (`test-environment.js`)
- ✅ Environment file existence
- ✅ Environment variable validation
- ✅ API key format checking
- ✅ OpenAI API key validation
- ✅ Service connectivity (Phoenix, Arize)
- ✅ End-to-end integration test

### 2. **Instrumentation Tests** (`test-instrumentation.js`)
- ✅ Tracer availability
- ✅ Manual span creation
- ✅ Session management
- ✅ OpenAI integration with tracing
- ✅ Phoenix connectivity

### 3. **API Endpoint Tests** (`test-api-endpoints.js`)
- ✅ Health check endpoint
- ✅ OpenAI API integration
- ✅ Cost calculation accuracy
- ✅ Session management (create/retrieve)
- ✅ Multi-turn conversations
- ✅ Concurrent request handling
- ✅ Error handling validation
- ✅ Invalid input handling
- ✅ Load testing (5 concurrent requests)

### 4. **Dual Destination Tests** (`test-dual-destinations.js`)
- ✅ Configuration validation
- ✅ OpenAI calls with dual tracing
- ✅ Phoenix connectivity check
- ✅ Arize credential validation
- ✅ Rich metadata span creation

### 5. **Arize Verification Tests** (`test-arize-verification.js`)
- ✅ Arize-specific trace sending
- ✅ Multiple trace verification (3 traces)
- ✅ Clear trace identifiers for debugging
- ✅ Troubleshooting guidance

## 🎯 Running Tests by Category

### Development Workflow
```bash
# 1. Start with environment validation
node test/run-tests.js env

# 2. Test basic instrumentation
node test/run-tests.js instrumentation

# 3. Test API endpoints
node test/run-tests.js api

# 4. Test dual tracing (if Arize configured)
node test/run-tests.js dual
```

### Production Validation
```bash
# Run all tests for complete validation
node test/run-tests.js all
```

### Debugging Specific Issues
```bash
# Environment issues
node test/run-tests.js env

# Tracing problems
node test/run-tests.js instrumentation

# API problems
node test/run-tests.js api

# Arize connectivity
node test/run-tests.js arize
```

## 📋 Prerequisites

### Required Environment Variables
```bash
# Essential
OPENAI_API_KEY=sk-...          # Required for API tests

# Optional (for full functionality)
ARIZE_SPACE_ID=your-space-id   # For Arize integration
ARIZE_API_KEY=your-api-key     # For Arize integration
```

### Required Services
- **Phoenix**: Running at `localhost:6006` (start with: `phoenix serve`)
- **Backend API**: Running at `localhost:3001` (start with: `npm start`)

## 🔧 Test Configuration

### Modifying Test Behavior
Tests can be customized by modifying environment variables:

```bash
# Change Phoenix endpoint
PHOENIX_COLLECTOR_ENDPOINT=http://custom-phoenix:6006

# Change API base URL
API_BASE=http://localhost:3001

# Change Arize model details
ARIZE_MODEL_ID=my-custom-model
ARIZE_MODEL_VERSION=2.0.0
```

## 📈 Expected Results

### All Tests Passing
When everything is configured correctly:
```
🎉 All tests passed! (5/5) - 100.0%
```

### Typical Results
- **Environment**: ✅ (if API keys configured)
- **Instrumentation**: ✅ (if Phoenix running)
- **API Endpoints**: ✅ (if backend + OpenAI working)
- **Dual Destinations**: ⚠️ (if Arize not configured)
- **Arize Verification**: ⚠️ (if Arize not configured)

## 🐛 Troubleshooting

### Common Issues

1. **OpenAI API Key Missing**
   ```bash
   # Add to .env file
   OPENAI_API_KEY=sk-your-key-here
   ```

2. **Phoenix Not Running**
   ```bash
   # Start Phoenix server
   phoenix serve
   ```

3. **Backend API Not Running**
   ```bash
   # Start backend server
   npm start
   ```

4. **Arize Not Configured** (Optional)
   ```bash
   # Add to .env file
   ARIZE_SPACE_ID=your-space-id
   ARIZE_API_KEY=your-api-key
   ```

### Test-Specific Troubleshooting

- **Environment tests failing**: Check `.env` file and API keys
- **Instrumentation tests failing**: Ensure Phoenix is running
- **API tests failing**: Ensure backend server is running
- **Arize tests failing**: Check Arize credentials and network connectivity

## 🏆 Success Criteria

### Minimum Viable Setup
- ✅ Environment tests pass
- ✅ Instrumentation tests pass  
- ✅ API tests pass

### Full Production Setup
- ✅ All 5 test suites pass
- ✅ Phoenix tracing working
- ✅ Arize integration working
- ✅ Cost tracking accurate
- ✅ Session management functional

---

**Ready to test?** Start with: `node test/run-tests.js env` 