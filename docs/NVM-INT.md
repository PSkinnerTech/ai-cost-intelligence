# Nevermined Integration for Arize Cost-Intelligence Demo

## Overview
Integrate Nevermined's credit-based payment system into the existing Arize A/B Testing GUI to demonstrate cost optimization through bulk credit purchases and enable prompt monetization.

## Integration Points with Existing Architecture

### 1. Enhance Existing Services

#### Update `services/abTestExecutor.ts`
Add credit-based execution alongside direct API calls:

```typescript
// Add to ABTestExecutor class
async executeWithCredits(
  variant: PromptVariant,
  input: TestInput,
  agentDID: string
): Promise<TestResult> {
  // Check credit balance
  const balance = await this.payments.getPlanBalance(userPlanDID);
  
  // Create task through Nevermined
  const aiTask = {
    query: this.promptManager.interpolateTemplate(variant.template, input.variables),
    name: variant.name,
    additional_params: [],
    artifacts: []
  };
  
  const accessConfig = await this.payments.query.getServiceAccessConfig(agentDID);
  const taskResult = await this.payments.query.createTask(agentDID, aiTask, accessConfig);
  
  // Calculate credit-based cost
  const creditsUsed = taskResult.cost || 1;
  const creditCost = this.calculateCreditCost(agentDID, creditsUsed);
  
  return {
    ...taskResult,
    cost: creditCost,
    executionMethod: 'credits'
  };
}
```

#### Update `services/costCalculator.ts`
Add credit cost calculation:

```typescript
// Add to existing cost calculation
calculateCreditCost(agentDID: string, creditsUsed: number): number {
  const creditPricing = {
    'agent-1-gpt4': 0.00005,    // $0.05 per 1000 credits
    'agent-2-gpt35': 0.00003,   // $0.03 per 1000 credits
    'agent-3-mini': 0.00001     // $0.01 per 1000 credits
  };
  
  return creditsUsed * creditPricing[agentDID];
}
```

### 2. Frontend Integration

#### Enhance `CostDashboard.tsx`
Add credit comparison view:

```typescript
// Add to CostDashboard component
const [creditComparison, setCreditComparison] = useState(null);

const fetchCreditComparison = async () => {
  const response = await axios.get(apiUrl('/api/credits/comparison'));
  setCreditComparison(response.data);
};

// In render, add comparison cards
{creditComparison && (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {creditComparison.agents.map(agent => (
      <div key={agent.id} className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold">{agent.name}</h3>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between">
            <span>Direct API Cost:</span>
            <span className="font-mono">${agent.directCost}</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>With Credits:</span>
            <span className="font-mono">${agent.creditCost}</span>
          </div>
          <div className="pt-2 border-t">
            <span className="text-sm font-semibold">
              Savings: {agent.savingsPercentage}%
            </span>
          </div>
        </div>
      </div>
    ))}
  </div>
)}
```

#### Update `BusinessImpactCalculator.ts`
Add credit savings to business impact:

```typescript
// Add to calculateBusinessImpact method
const creditSavings = this.calculateCreditSavings(testResults, usage);

// New method
private calculateCreditSavings(testResults: TestResults, usage: UsagePattern) {
  // Assuming 40-60% savings with bulk credits
  const bulkDiscount = 0.5; // 50% average discount
  const directCostMonthly = testResults.variantA.avgCost * usage.requestsPerMonth;
  const creditCostMonthly = directCostMonthly * (1 - bulkDiscount);
  
  return {
    monthlyDirectCost: directCostMonthly,
    monthlyCreditCost: creditCostMonthly,
    monthlySavings: directCostMonthly - creditCostMonthly,
    annualSavings: (directCostMonthly - creditCostMonthly) * 12
  };
}
```

### 3. New API Endpoints

#### Add `api/credits/` endpoints:

```typescript
// api/credits/comparison.ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const agents = [
    {
      id: 'agent-1-gpt4',
      name: 'Agent 1 (GPT-4)',
      directCost: 0.05,
      creditCost: 0.02,
      savingsPercentage: 60
    },
    {
      id: 'agent-2-gpt35',
      name: 'Agent 2 (GPT-3.5)',
      directCost: 0.03,
      creditCost: 0.012,
      savingsPercentage: 60
    },
    {
      id: 'agent-3-mini',
      name: 'Agent 3 (Mini)',
      directCost: 0.01,
      creditCost: 0.004,
      savingsPercentage: 60
    }
  ];
  
  return res.json({ success: true, agents });
}

// api/credits/purchase.ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { planDID, amount } = req.body;
  
  // Simulate credit purchase
  const purchase = {
    planDID,
    credits: amount,
    cost: amount * 0.00005, // $0.05 per 1000 credits
    timestamp: new Date()
  };
  
  return res.json({ success: true, purchase });
}
```

```typescript
// Agent 1: Premium Model (GPT-4)
const agent1Plan = await payments.createCreditsPlan({
  name: 'Agent 1 - Premium GPT-4',
  description: 'High-quality responses with GPT-4',
  price: 50000000n, // 50 USDC for 1000 credits
  tokenAddress: USDC_ADDRESS,
  amountOfCredits: 1000
});

// Agent 2: Standard Model (GPT-3.5)
const agent2Plan = await payments.createCreditsPlan({
  name: 'Agent 2 - Standard GPT-3.5',
  description: 'Cost-effective responses',
  price: 30000000n, // 30 USDC for 1000 credits
  tokenAddress: USDC_ADDRESS,
  amountOfCredits: 1000
});

// Agent 3: Lightweight Model
const agent3Plan = await payments.createCreditsPlan({
  name: 'Agent 3 - Lightweight',
  description: 'Basic queries only',
  price: 10000000n, // 10 USDC for 1000 credits
  tokenAddress: USDC_ADDRESS,
  amountOfCredits: 1000
});
```

### 2. Dynamic Credit Charging Based on Phoenix Traces

```typescript
// In your server.ts, integrate with Nevermined after Phoenix traces
app.post('/api/test/execute-with-credits', async (req, res) => {
  const { promptName, variables, agentId, userId } = req.body;
  
  // Check user's credit balance
  const balance = await payments.getPlanBalance(userPlanDID);
  
  if (balance.balance < estimatedCredits) {
    return res.status(402).json({ error: 'Insufficient credits' });
  }
  
  // Execute with Phoenix tracing
  const result = await withSession(sessionId, async () => {
    return tracedOperation('credited-prompt-execution', {
      'agent.id': agentId,
      'credits.estimated': estimatedCredits,
    }, async () => {
      const response = await openai.chat.completions.create({
        ...promptParams,
        stream: false,
      });
      
      // Calculate actual credits based on token usage
      const actualCredits = Math.ceil(response.usage.total_tokens / 100);
      
      // Charge credits dynamically
      await payments.query.updateStep(stepId, {
        cost: actualCredits,
      });
      
      return response;
    });
  });
  
  res.json({ 
    result,
    creditsCharged: actualCredits,
    remainingBalance: balance.balance - actualCredits,
    costSavings: calculateSavings(actualCredits)
  });
});
```

### 3. Cost Comparison Dashboard Integration

```typescript
// Add to your CostCalculator service
export class EnhancedCostCalculator extends CostCalculator {
  async calculateCreditBasedCost(spanId: string, agentId: string) {
    const span = await this.phoenixClient.getSpan(spanId);
    const tokens = span.attributes['llm.token_count.total'];
    
    // Direct API cost (current calculation)
    const directCost = this.calculateTokenCost(
      span.attributes['llm.token_count.prompt'],
      span.attributes['llm.token_count.completion'],
      span.attributes['llm.model_name']
    );
    
    // Credit-based cost
    const creditsUsed = Math.ceil(tokens / 100); // 1 credit per 100 tokens
    const creditCost = this.getCreditCost(agentId, creditsUsed);
    
    return {
      directCost,
      creditCost,
      savings: directCost.total - creditCost,
      savingsPercentage: ((directCost.total - creditCost) / directCost.total) * 100
    };
  }
  
  private getCreditCost(agentId: string, credits: number): number {
    const creditPrices = {
      'agent1': 0.05, // $0.05 per credit
      'agent2': 0.03, // $0.03 per credit
      'agent3': 0.01  // $0.01 per credit
    };
    
    return credits * (creditPrices[agentId] || 0.05);
  }
}
```

### 4. Demo Flow

1. **Setup Phase**
   - Create Payment Plans for each agent type
   - Register agents with different credit costs
   - Purchase bulk credits at discounted rates

2. **Execution Phase**
   - User selects prompt and agent
   - System checks credit balance
   - Phoenix traces the execution
   - Credits charged based on actual token usage

3. **Comparison Phase**
   - Show side-by-side costs:
     - Direct API cost (from Phoenix traces)
     - Credit-based cost (from Nevermined)
     - Savings percentage
   - Aggregate savings over time

### 5. Frontend Components

```tsx
// CostComparisonWidget.tsx
export function CostComparisonWidget({ testId, agentId }) {
  const [comparison, setComparison] = useState(null);
  
  useEffect(() => {
    async function fetchComparison() {
      const response = await fetch(`/api/costs/credit-comparison`, {
        method: 'POST',
        body: JSON.stringify({ testId, agentId })
      });
      const data = await response.json();
      setComparison(data);
    }
    fetchComparison();
  }, [testId, agentId]);
  
  return (
    <div className="cost-comparison">
      <div className="metric">
        <label>Direct API Cost</label>
        <span className="cost">${comparison?.directCost.toFixed(4)}</span>
      </div>
      <div className="metric highlight">
        <label>With Nevermined Credits</label>
        <span className="cost">${comparison?.creditCost.toFixed(4)}</span>
      </div>
      <div className="savings">
        <label>Savings</label>
        <span className="percentage">{comparison?.savingsPercentage.toFixed(0)}%</span>
      </div>
    </div>
  );
}
```

## Key Benefits to Demonstrate

1. **Cost Reduction**
   - Bulk credit purchases reduce per-request costs
   - Dynamic routing to cheaper agents when appropriate
   - Predictable pricing with credit packages

2. **Monetization**
   - Phoenix users can sell access to their optimized prompts
   - Create tiered access (premium/standard/basic)
   - Revenue sharing opportunities

3. **Usage Control**
   - Credit limits prevent cost overruns
   - Time-based or request-based access
   - Built-in rate limiting

4. **Enterprise Features**
   - Department-level credit allocation
   - Usage tracking and attribution
   - Compliance and audit trails

## Implementation Steps

1. **Phase 1: Basic Integration** (1-2 days)
   - Install Nevermined libraries
   - Create sample Payment Plans
   - Add credit balance checking

2. **Phase 2: Dynamic Charging** (2-3 days)
   - Integrate with Phoenix trace data
   - Implement dynamic credit calculation
   - Add cost comparison endpoints

3. **Phase 3: Dashboard Updates** (2-3 days)
   - Add credit purchase widget
   - Create comparison visualizations
   - Show savings metrics

4. **Phase 4: Advanced Features** (3-5 days)
   - Multi-agent routing optimization
   - Prompt marketplace integration
   - Revenue tracking dashboard

## Demo Script

1. **Show Current State**: "Here's what Phoenix users see today - just costs"
2. **Enable Credits**: "Now let's add Nevermined credits to reduce costs"
3. **Execute Tests**: "Run the same prompts through credit-based agents"
4. **Compare Results**: "See 40-60% cost savings with identical quality"
5. **Monetization**: "Now let's sell access to our best prompts"
6. **Revenue Dashboard**: "Track earnings from prompt sales"

## Technical Requirements

- Nevermined API Key
- USDC tokens for testing (testnet)
- Updated server endpoints
- Enhanced cost calculator
- New dashboard components

## Expected Outcomes

- Demonstrate 40-60% cost reduction
- Show monetization potential
- Highlight enterprise features
- Position Arize as complete economic platform