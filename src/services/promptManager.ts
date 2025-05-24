// src/services/promptManager.ts
// Service for managing prompt variants and A/B tests

import { v4 as uuidv4 } from 'uuid';
import {
  PromptVariant,
  ABTest,
  TestInput,
  ABTestConfiguration,
  PromptVariable
} from '../types/prompt';

export class PromptManager {
  private prompts = new Map<string, PromptVariant>();
  private tests = new Map<string, ABTest>();
  private inputs = new Map<string, TestInput>();

  // ============================
  // PROMPT VARIANT MANAGEMENT
  // ============================

  createVariant(params: {
    name: string;
    description: string;
    template: string;
    variables?: PromptVariable[];
    model?: string;
    parameters?: any;
    tags?: string[];
    parentId?: string;
  }): PromptVariant {
    const id = uuidv4();
    const now = new Date();

    // Determine version number
    let version = 1;
    if (params.parentId) {
      const parent = this.prompts.get(params.parentId);
      if (parent) {
        version = parent.version + 1;
      }
    }

    const variant: PromptVariant = {
      id,
      name: params.name,
      description: params.description,
      template: params.template,
      variables: params.variables || [],
      version,
      parentId: params.parentId,
      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy: 'system', // TODO: Add user management
        tags: params.tags || [],
        model: params.model || 'gpt-3.5-turbo',
        parameters: {
          temperature: 0.7,
          maxTokens: 1000,
          ...params.parameters
        }
      }
    };

    this.prompts.set(id, variant);
    return variant;
  }

  updateVariant(id: string, updates: Partial<PromptVariant>): PromptVariant {
    const existing = this.prompts.get(id);
    if (!existing) {
      throw new Error(`Prompt variant ${id} not found`);
    }

    const updated: PromptVariant = {
      ...existing,
      ...updates,
      id: existing.id, // Ensure ID can't be changed
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        updatedAt: new Date()
      }
    };

    this.prompts.set(id, updated);
    return updated;
  }

  getVariant(id: string): PromptVariant | undefined {
    return this.prompts.get(id);
  }

  listVariants(options?: {
    tags?: string[];
    model?: string;
    parentId?: string;
  }): PromptVariant[] {
    let variants = Array.from(this.prompts.values());

    if (options?.tags) {
      variants = variants.filter(v => 
        options.tags!.some(tag => v.metadata.tags.includes(tag))
      );
    }

    if (options?.model) {
      variants = variants.filter(v => v.metadata.model === options.model);
    }

    if (options?.parentId) {
      variants = variants.filter(v => v.parentId === options.parentId);
    }

    return variants.sort((a, b) => 
      b.metadata.updatedAt.getTime() - a.metadata.updatedAt.getTime()
    );
  }

  deleteVariant(id: string): boolean {
    const variant = this.prompts.get(id);
    if (!variant) {
      return false;
    }

    // Check if variant is used in any active tests
    const activeTests = this.listABTests({ status: 'running' });
    const isInUse = activeTests.some(test => 
      test.variants.some(v => v.id === id)
    );

    if (isInUse) {
      throw new Error('Cannot delete variant that is used in active A/B tests');
    }

    return this.prompts.delete(id);
  }

  // ============================
  // TEST INPUT MANAGEMENT  
  // ============================

  createTestInput(params: {
    prompt: string;
    variables?: Record<string, string>;
    expectedOutput?: string;
    category?: string;
  }): TestInput {
    const id = uuidv4();
    const input: TestInput = {
      id,
      prompt: params.prompt,
      variables: params.variables || {},
      expectedOutput: params.expectedOutput,
      category: params.category
    };

    this.inputs.set(id, input);
    return input;
  }

  getTestInput(id: string): TestInput | undefined {
    return this.inputs.get(id);
  }

  listTestInputs(category?: string): TestInput[] {
    let inputs = Array.from(this.inputs.values());
    
    if (category) {
      inputs = inputs.filter(input => input.category === category);
    }

    return inputs;
  }

  // ============================
  // A/B TEST MANAGEMENT
  // ============================

  createABTest(params: {
    name: string;
    description: string;
    variantIds: string[];
    inputIds: string[];
    configuration: ABTestConfiguration;
  }): ABTest {
    const id = uuidv4();
    const now = new Date();

    // Validate variants exist
    const variants = params.variantIds.map(vId => {
      const variant = this.prompts.get(vId);
      if (!variant) {
        throw new Error(`Prompt variant ${vId} not found`);
      }
      return variant;
    });

    // Validate inputs exist
    const inputs = params.inputIds.map(iId => {
      const input = this.inputs.get(iId);
      if (!input) {
        throw new Error(`Test input ${iId} not found`);
      }
      return input;
    });

    const test: ABTest = {
      id,
      name: params.name,
      description: params.description,
      variants,
      inputs,
      configuration: params.configuration,
      status: 'draft',
      results: [],
      createdAt: now,
      createdBy: 'system'
    };

    this.tests.set(id, test);
    return test;
  }

  updateABTest(id: string, updates: Partial<ABTest>): ABTest {
    const existing = this.tests.get(id);
    if (!existing) {
      throw new Error(`A/B test ${id} not found`);
    }

    // Prevent certain updates on running tests
    if (existing.status === 'running') {
      const restrictedFields = ['variants', 'inputs', 'configuration'];
      const hasRestrictedUpdates = restrictedFields.some(field => 
        updates.hasOwnProperty(field)
      );
      
      if (hasRestrictedUpdates) {
        throw new Error('Cannot modify test configuration while test is running');
      }
    }

    const updated: ABTest = {
      ...existing,
      ...updates,
      id: existing.id // Ensure ID can't be changed
    };

    this.tests.set(id, updated);
    return updated;
  }

  getABTest(id: string): ABTest | undefined {
    return this.tests.get(id);
  }

  listABTests(options?: {
    status?: ABTest['status'];
    createdBy?: string;
  }): ABTest[] {
    let tests = Array.from(this.tests.values());

    if (options?.status) {
      tests = tests.filter(test => test.status === options.status);
    }

    if (options?.createdBy) {
      tests = tests.filter(test => test.createdBy === options.createdBy);
    }

    return tests.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  startABTest(id: string): ABTest {
    const test = this.tests.get(id);
    if (!test) {
      throw new Error(`A/B test ${id} not found`);
    }

    if (test.status !== 'draft') {
      throw new Error(`Cannot start test in ${test.status} status`);
    }

    // Validate test configuration
    this.validateABTestConfiguration(test);

    const updated = this.updateABTest(id, {
      status: 'running',
      startedAt: new Date()
    });

    return updated;
  }

  stopABTest(id: string): ABTest {
    const test = this.tests.get(id);
    if (!test) {
      throw new Error(`A/B test ${id} not found`);
    }

    if (test.status !== 'running') {
      throw new Error(`Cannot stop test in ${test.status} status`);
    }

    const updated = this.updateABTest(id, {
      status: 'stopped',
      completedAt: new Date()
    });

    return updated;
  }

  // ============================
  // UTILITY METHODS
  // ============================

  private validateABTestConfiguration(test: ABTest): void {
    // Validate variants
    if (test.variants.length < 2) {
      throw new Error('A/B test requires at least 2 variants');
    }

    // Validate traffic split
    const { trafficSplit } = test.configuration;
    if (trafficSplit.length !== test.variants.length) {
      throw new Error('Traffic split must match number of variants');
    }

    const totalSplit = trafficSplit.reduce((sum, split) => sum + split, 0);
    if (Math.abs(totalSplit - 100) > 0.01) {
      throw new Error('Traffic split must sum to 100%');
    }

    // Validate inputs
    if (test.inputs.length === 0) {
      throw new Error('A/B test requires at least one test input');
    }

    // Validate sample size
    const minTotalSamples = test.configuration.minSampleSize * test.variants.length;
    if (minTotalSamples > test.inputs.length * 10) {
      console.warn(`Warning: Requested sample size (${minTotalSamples}) may require multiple runs with ${test.inputs.length} inputs`);
    }
  }

  // ============================
  // TEMPLATE PROCESSING
  // ============================

  interpolateTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    
    // Replace {{variable}} patterns
    Object.entries(variables).forEach(([key, value]) => {
      const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(pattern, value);
    });

    return result;
  }

  extractVariables(template: string): PromptVariable[] {
    const variablePattern = /\{\{\s*([^}]+)\s*\}\}/g;
    const variables: PromptVariable[] = [];
    const seen = new Set<string>();

    let match;
    while ((match = variablePattern.exec(template)) !== null) {
      const name = match[1].trim();
      if (!seen.has(name)) {
        variables.push({
          name,
          required: true,
          description: `Variable: ${name}`
        });
        seen.add(name);
      }
    }

    return variables;
  }

  // ============================
  // STATISTICS & CLEANUP
  // ============================

  getStats(): {
    totalVariants: number;
    totalTests: number;
    activeTests: number;
    totalInputs: number;
  } {
    return {
      totalVariants: this.prompts.size,
      totalTests: this.tests.size,
      activeTests: this.listABTests({ status: 'running' }).length,
      totalInputs: this.inputs.size
    };
  }

  cleanup(): void {
    // Clean up completed tests older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    for (const [id, test] of this.tests.entries()) {
      if (test.status === 'completed' && 
          test.completedAt && 
          test.completedAt < thirtyDaysAgo) {
        this.tests.delete(id);
      }
    }
  }
} 