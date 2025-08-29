import { describe, expect, it, vi, beforeEach } from "vitest";

// Interfaces for type safety
interface ClarityResponse<T> {
  ok: boolean;
  value: T | number; // number for error codes
}

interface PeriodInfo {
  startBlock: number;
  endBlock: number;
  totalContributions: number;
  totalDividends: number;
  distributed: boolean;
}

interface MemberShare {
  contribution: number;
  sharePercentage: number;
  claimed: boolean;
  claimAmount: number;
}

interface HistoricalClaim {
  amount: number;
  timestamp: number;
}

interface ContractConfig {
  admin: string;
  paused: boolean;
  periodDuration: number;
  minThreshold: number;
  treasury: string;
  tracker: string;
  payoutToken: string;
}

interface ContractState {
  admin: string;
  paused: boolean;
  currentPeriod: number;
  periodDuration: number;
  lastPeriodStart: number;
  minContributionThreshold: number;
  treasuryContract: string;
  contributionTrackerContract: string;
  governanceContract: string;
  payoutToken: string;
  periodInfo: Map<number, PeriodInfo>;
  memberShares: Map<string, MemberShare>; // Key: `${period}-${member}`
  historicalClaims: Map<string, HistoricalClaim>; // Key: `${member}-${period}`
}

// Mock contract implementation
class DividendDistributorMock {
  private state: ContractState = {
    admin: "deployer",
    paused: false,
    currentPeriod: 0,
    periodDuration: 144,
    lastPeriodStart: 0,
    minContributionThreshold: 1000000,
    treasuryContract: "treasury",
    contributionTrackerContract: "tracker",
    governanceContract: "governance",
    payoutToken: "SP000000000000000000002Q6VF78.byzantion-stx",
    periodInfo: new Map(),
    memberShares: new Map(),
    historicalClaims: new Map(),
  };

  private ERR_UNAUTHORIZED = 100;
  private ERR_INVALID_PERIOD = 101;
  private ERR_NO_CONTRIBUTIONS = 102;
  private ERR_ALREADY_CLAIMED = 103;
  private ERR_PAUSED = 104;
  private ERR_INVALID_AMOUNT = 105;
  private ERR_NO_FUNDS = 106;
  private ERR_INVALID_TOKEN = 107;
  private ERR_PERIOD_NOT_ENDED = 108;
  private ERR_INVALID_CONFIG = 109;
  private ERR_MAX_PERIODS_REACHED = 110;

  private MAX_PERIODS = 1000;

  // Helper to simulate block height
  private mockBlockHeight = 0;
  private setMockBlockHeight(height: number) {
    this.mockBlockHeight = height;
  }

  // Mock external calls
  private mockGetMemberContribution(member: string, period: number): number {
    // Simulate based on test setup
    return 10000000; // Default contribution
  }

  private mockTransferFromTreasury(amount: number, recipient: string, token: string): ClarityResponse<boolean> {
    return { ok: true, value: true };
  }

  setAdmin(caller: string, newAdmin: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.admin = newAdmin;
    return { ok: true, value: true };
  }

  pauseContract(caller: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.paused = true;
    return { ok: true, value: true };
  }

  unpauseContract(caller: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.paused = false;
    return { ok: true, value: true };
  }

  setPeriodDuration(caller: string, newDuration: number): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    if (newDuration <= 0) {
      return { ok: false, value: this.ERR_INVALID_CONFIG };
    }
    this.state.periodDuration = newDuration;
    return { ok: true, value: true };
  }

  setMinContributionThreshold(caller: string, newThreshold: number): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.minContributionThreshold = newThreshold;
    return { ok: true, value: true };
  }

  setTreasuryContract(caller: string, newTreasury: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.treasuryContract = newTreasury;
    return { ok: true, value: true };
  }

  setContributionTracker(caller: string, newTracker: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.contributionTrackerContract = newTracker;
    return { ok: true, value: true };
  }

  setPayoutToken(caller: string, newToken: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.payoutToken = newToken;
    return { ok: true, value: true };
  }

  startNewPeriod(caller: string): ClarityResponse<number> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    const current = this.state.currentPeriod;
    const nextPeriod = current + 1;
    const now = this.mockBlockHeight;
    const lastStart = this.state.lastPeriodStart;
    const expectedEnd = lastStart + this.state.periodDuration;
    if (now < expectedEnd) {
      return { ok: false, value: this.ERR_PERIOD_NOT_ENDED };
    }
    if (current >= this.MAX_PERIODS) {
      return { ok: false, value: this.ERR_MAX_PERIODS_REACHED };
    }
    // Close previous period if exists
    if (current > 0) {
      const prevInfo = this.state.periodInfo.get(current) || {
        startBlock: lastStart,
        endBlock: now,
        totalContributions: 0,
        totalDividends: 0,
        distributed: false,
      };
      this.state.periodInfo.set(current, { ...prevInfo, endBlock: now });
    }
    this.state.currentPeriod = nextPeriod;
    this.state.lastPeriodStart = now;
    this.state.periodInfo.set(nextPeriod, {
      startBlock: now,
      endBlock: 0,
      totalContributions: 0,
      totalDividends: 0,
      distributed: false,
    });
    return { ok: true, value: nextPeriod };
  }

  calculatePeriodDividends(caller: string, period: number, totalDividends: number): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    const periodData = this.state.periodInfo.get(period);
    if (!periodData) {
      return { ok: false, value: this.ERR_INVALID_PERIOD };
    }
    if (periodData.distributed) {
      return { ok: false, value: this.ERR_ALREADY_CLAIMED };
    }
    if (totalDividends <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    const totalContrib = periodData.totalContributions;
    if (totalContrib <= 0) {
      return { ok: false, value: this.ERR_NO_CONTRIBUTIONS };
    }
    this.state.periodInfo.set(period, { ...periodData, totalDividends, distributed: true });
    return { ok: true, value: true };
  }

  claimDividends(caller: string, period: number): ClarityResponse<number> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    const periodData = this.state.periodInfo.get(period);
    if (!periodData) {
      return { ok: false, value: this.ERR_INVALID_PERIOD };
    }
    if (!periodData.distributed) {
      return { ok: false, value: this.ERR_PERIOD_NOT_ENDED };
    }
    const shareKey = `${period}-${caller}`;
    const shareData = this.state.memberShares.get(shareKey) || {
      contribution: 0,
      sharePercentage: 0,
      claimed: false,
      claimAmount: 0,
    };
    if (shareData.claimed) {
      return { ok: false, value: this.ERR_ALREADY_CLAIMED };
    }
    const contrib = this.mockGetMemberContribution(caller, period);
    if (contrib < this.state.minContributionThreshold) {
      return { ok: false, value: this.ERR_NO_CONTRIBUTIONS };
    }
    const totalContrib = periodData.totalContributions;
    const share = (contrib * 10000) / totalContrib;
    const totalDiv = periodData.totalDividends;
    const claimAmount = (totalDiv * share) / 10000;
    if (claimAmount <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    const transferRes = this.mockTransferFromTreasury(claimAmount, caller, this.state.payoutToken);
    if (!transferRes.ok) {
      return transferRes as ClarityResponse<number>;
    }
    this.state.memberShares.set(shareKey, {
      contribution: contrib,
      sharePercentage: share,
      claimed: true,
      claimAmount,
    });
    const claimKey = `${caller}-${period}`;
    this.state.historicalClaims.set(claimKey, {
      amount: claimAmount,
      timestamp: this.mockBlockHeight,
    });
    return { ok: true, value: claimAmount };
  }

  getCurrentPeriod(): ClarityResponse<number> {
    return { ok: true, value: this.state.currentPeriod };
  }

  getPeriodInfo(period: number): ClarityResponse<PeriodInfo | null> {
    return { ok: true, value: this.state.periodInfo.get(period) ?? null };
  }

  getMemberShare(period: number, member: string): ClarityResponse<MemberShare | null> {
    const key = `${period}-${member}`;
    return { ok: true, value: this.state.memberShares.get(key) ?? null };
  }

  getHistoricalClaim(member: string, period: number): ClarityResponse<HistoricalClaim | null> {
    const key = `${member}-${period}`;
    return { ok: true, value: this.state.historicalClaims.get(key) ?? null };
  }

  getContractConfig(): ClarityResponse<ContractConfig> {
    return { ok: true, value: { ...this.state } };
  }

  updateTotalContributions(caller: string, period: number, newTotal: number): ClarityResponse<boolean> {
    if (caller !== this.state.contributionTrackerContract) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    const periodData = this.state.periodInfo.get(period);
    if (!periodData) {
      return { ok: false, value: this.ERR_INVALID_PERIOD };
    }
    this.state.periodInfo.set(period, { ...periodData, totalContributions: newTotal });
    return { ok: true, value: true };
  }
}

// Test setup
const accounts = {
  deployer: "deployer",
  user1: "wallet_1",
  user2: "wallet_2",
  tracker: "tracker",
};

describe("DividendDistributor Contract", () => {
  let contract: DividendDistributorMock;

  beforeEach(() => {
    contract = new DividendDistributorMock();
    contract.setMockBlockHeight(0);
    vi.resetAllMocks();
  });

  it("should allow admin to set new admin", () => {
    const result = contract.setAdmin(accounts.deployer, accounts.user1);
    expect(result).toEqual({ ok: true, value: true });
    const config = contract.getContractConfig();
    expect(config.value.admin).toBe(accounts.user1);
  });

  it("should prevent non-admin from setting admin", () => {
    const result = contract.setAdmin(accounts.user1, accounts.user2);
    expect(result).toEqual({ ok: false, value: 100 });
  });

  it("should pause and unpause the contract", () => {
    let result = contract.pauseContract(accounts.deployer);
    expect(result).toEqual({ ok: true, value: true });
    let config = contract.getContractConfig();
    expect(config.value.paused).toBe(true);

    result = contract.unpauseContract(accounts.deployer);
    expect(result).toEqual({ ok: true, value: true });
    config = contract.getContractConfig();
    expect(config.value.paused).toBe(false);
  });

  it("should start new period after duration", () => {
    contract.setMockBlockHeight(144);
    const result = contract.startNewPeriod(accounts.deployer);
    expect(result).toEqual({ ok: true, value: 1 });
    const current = contract.getCurrentPeriod();
    expect(current).toEqual({ ok: true, value: 1 });
  });

  it("should prevent starting period before end", () => {
    contract.setMockBlockHeight(100);
    const result = contract.startNewPeriod(accounts.deployer);
    expect(result).toEqual({ ok: false, value: 108 });
  });

  it("should calculate dividends for period", () => {
    // Setup period
    contract.setMockBlockHeight(144);
    contract.startNewPeriod(accounts.deployer);
    contract.updateTotalContributions(accounts.tracker, 1, 10000000);

    const calcResult = contract.calculatePeriodDividends(accounts.deployer, 1, 1000000);
    expect(calcResult).toEqual({ ok: true, value: true });

    const periodInfo = contract.getPeriodInfo(1);
    expect(periodInfo.value?.totalDividends).toBe(1000000);
    expect(periodInfo.value?.distributed).toBe(true);
  });

  it("should allow member to claim dividends", () => {
    // Setup
    contract.setMockBlockHeight(144);
    contract.startNewPeriod(accounts.deployer);
    contract.updateTotalContributions(accounts.tracker, 1, 10000000);
    contract.calculatePeriodDividends(accounts.deployer, 1, 1000000);

    const claimResult = contract.claimDividends(accounts.user1, 1);
    expect(claimResult).toEqual({ ok: true, value: 1000000 }); // Since contrib=10000000, total=10000000, share=100%

    const share = contract.getMemberShare(1, accounts.user1);
    expect(share.value?.claimed).toBe(true);
    expect(share.value?.claimAmount).toBe(1000000);
  });

  it("should prevent claim if paused", () => {
    contract.pauseContract(accounts.deployer);
    const result = contract.claimDividends(accounts.user1, 1);
    expect(result).toEqual({ ok: false, value: 104 });
  });

  it("should prevent double claim", () => {
    // Setup as above
    contract.setMockBlockHeight(144);
    contract.startNewPeriod(accounts.deployer);
    contract.updateTotalContributions(accounts.tracker, 1, 10000000);
    contract.calculatePeriodDividends(accounts.deployer, 1, 1000000);
    contract.claimDividends(accounts.user1, 1);

    const secondClaim = contract.claimDividends(accounts.user1, 1);
    expect(secondClaim).toEqual({ ok: false, value: 103 });
  });

  it("should update total contributions from tracker", () => {
    contract.setMockBlockHeight(144);
    contract.startNewPeriod(accounts.deployer);

    const updateResult = contract.updateTotalContributions(accounts.tracker, 1, 5000000);
    expect(updateResult).toEqual({ ok: true, value: true });

    const periodInfo = contract.getPeriodInfo(1);
    expect(periodInfo.value?.totalContributions).toBe(5000000);
  });

  it("should prevent unauthorized total contributions update", () => {
    const updateResult = contract.updateTotalContributions(accounts.user1, 1, 5000000);
    expect(updateResult).toEqual({ ok: false, value: 100 });
  });
});