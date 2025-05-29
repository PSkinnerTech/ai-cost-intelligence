// Nevermined API Service
// Handles all interactions with the Nevermined cost comparison APIs

import { apiUrl, API_ENDPOINTS } from '../config/api';

export interface Agent {
  id: string;
  name: string;
  model: string;
  directCost: number;
  creditCost: number;
  savings: number;
  savingsPercentage: number;
}

export interface BusinessImpact {
  totalDirectCost: number;
  totalCreditCost: number;
  totalSavings: number;
  monthlySavings: number;
  annualSavings: number;
}

export interface CostComparison {
  success: boolean;
  timestamp: string;
  requestVolume: number;
  agents: Agent[];
  businessImpact: BusinessImpact;
  currency: string;
  network: string;
  marketplace: string;
}

export interface CreditBalance {
  success: boolean;
  balance: number;
  currency: string;
  address: string;
  timestamp: string;
}

export interface InitResponse {
  success: boolean;
  message: string;
  isKeeperConnected: boolean;
  timestamp: string;
  config: {
    web3ProviderUri: string;
    neverminedNodeUri: string;
    marketplaceUri: string;
  };
}

class NeverminedService {
  /**
   * Initialize Nevermined SDK
   */
  async initialize(): Promise<InitResponse> {
    try {
      const response = await fetch(apiUrl(API_ENDPOINTS.NEVERMINED.INIT));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to initialize Nevermined SDK:', error);
      throw error;
    }
  }

  /**
   * Get credit balance
   */
  async getCreditBalance(): Promise<CreditBalance> {
    try {
      const response = await fetch(apiUrl(API_ENDPOINTS.NEVERMINED.CREDITS));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get credit balance:', error);
      throw error;
    }
  }

  /**
   * Purchase credits
   */
  async purchaseCredits(amount: number): Promise<any> {
    try {
      const response = await fetch(apiUrl(API_ENDPOINTS.NEVERMINED.CREDITS), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to purchase credits:', error);
      throw error;
    }
  }

  /**
   * Get cost comparison for agents
   */
  async getCostComparison(volume?: number): Promise<CostComparison> {
    try {
      const url = volume 
        ? apiUrl(`${API_ENDPOINTS.NEVERMINED.COMPARISON}?volume=${volume}`)
        : apiUrl(API_ENDPOINTS.NEVERMINED.COMPARISON);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get cost comparison:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      const response = await fetch(apiUrl(API_ENDPOINTS.HEALTH));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const neverminedService = new NeverminedService(); 