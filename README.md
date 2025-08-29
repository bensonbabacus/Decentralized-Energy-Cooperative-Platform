# ⚡ Decentralized Energy Cooperative Platform

Welcome to the future of community-powered energy! This Web3 project empowers local communities to form energy cooperatives on the Stacks blockchain, where members contribute renewable energy (like solar or wind) to shared grids and earn fair dividends based on verified contributions. Say goodbye to opaque utility companies and hello to transparent, blockchain-secured energy sharing.

## 🌍 The Real-World Problem It Solves

In many regions, small-scale renewable energy producers (e.g., homeowners with solar panels) struggle with unfair compensation, lack of transparency in grid contributions, and centralized control by big utilities. Energy cooperatives exist but often face administrative hurdles, trust issues, and inefficient dividend distribution. This project decentralizes the process, using smart contracts to automate verification, tracking, and payouts—reducing costs, building trust, and incentivizing green energy adoption to combat climate change.

## ✨ Features

🔋 Register as a member and link your energy devices  
📊 Track real-time energy contributions via verified oracles  
💰 Automatically distribute dividends proportional to contributions  
🗳️ Govern the cooperative through decentralized voting  
🔒 Secure treasury management for coop funds  
📈 Audit trails for full transparency  
⚖️ Resolve disputes on-chain  
🚀 Scalable for global energy grids  

## 🛠 How It Works

**For Members (Energy Producers)**  
- Join the cooperative by registering with the Membership contract.  
- Link your smart meter or device to submit energy production data (verified via oracles).  
- The Contribution Tracker logs your inputs automatically.  
- At payout periods, the Dividend Distributor calculates your share based on total grid contributions and sends STX or tokens to your wallet. Boom—earn while going green!  

**For Verifiers and Admins**  
- Use the Governance contract to propose and vote on changes (e.g., new rules or expansions).  
- Check the Audit contract for immutable records of all transactions.  
- If issues arise, invoke the Dispute Resolution contract for fair, on-chain arbitration.  

That's it! No middlemen, just pure, decentralized energy democracy.

## 📜 Smart Contracts

This project leverages 8 Clarity smart contracts on the Stacks blockchain for modularity and security. Each handles a specific aspect to keep things efficient and auditable:

1. **Membership.clar**: Manages member registration, verification, and expulsion. Tracks user profiles and eligibility.  
2. **ContributionTracker.clar**: Records and verifies energy contributions from members using oracle data (e.g., kWh produced). Prevents fraud with hash-based proofs.  
3. **DividendDistributor.clar**: Calculates dividends based on contribution ratios and distributes funds from the treasury. Supports periodic payouts.  
4. **Governance.clar**: Enables proposal creation, voting, and execution. Uses token-weighted voting for fair decision-making.  
5. **Treasury.clar**: Holds and manages cooperative funds (e.g., from energy sales or grants). Ensures secure inflows/outflows.  
6. **OracleIntegrator.clar**: Interfaces with external oracles to fetch real-world energy data securely, timestamping for immutability.  
7. **DisputeResolution.clar**: Handles member disputes (e.g., over contributions) through arbitration logic and escrowed resolutions.  
8. **AuditLog.clar**: Provides read-only access to all historical data, ensuring transparency and compliance checks.  

These contracts interact seamlessly—e.g., ContributionTracker feeds data to DividendDistributor—creating a robust, tamper-proof system. Deploy them on Stacks for Bitcoin-level security!