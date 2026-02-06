# Scaling Strategy: Continental Expansion

## 1. Outsourced Components (PaaS/SaaS)

### Database (MongoDB)
*   **Tech Strategy:**
    *   **Sharding:** Partition data by `region` (e.g., `IN-North`, `IN-South`) to distribute write load.
    *   **Read Replicas:** Deploy secondaries in target regions to minimize read latency for feed/discovery.
    *   **Indexing:** strict compound indexes on `[location, date]` for geospatial queries.
*   **Business Trigger:** When IOPS saturation occurs or storage exceeds 2TB. Move from Shared to Dedicated Cluster tiers (Atlas M30+).

### Hosting (Koyeb/PaaS)
*   **Tech Strategy:**
    *   **Horizontal Autoscaling:** Configure CPU-based triggers (up to 70% utilization) to spawn instances dynamically.
    *   **Global Edge Network:** Utilize Koyeb's edge locations for SSL termination and static asset caching closer to users.
    *   **CDN Offloading:** Ensure *all* media (Cloudinary) and static UI (Cloudflare) bypass the app server.
*   **Business Trigger:** Rapid traffic spikes (e.g., events at 8 PM Fri/Sat). PaaS handles "burst" better than fixed infrastructure.

## 2. Transition to Custom Infrastructure (IaaS/Bare Metal)

### Trigger Points (When to Switch)
1.  **Cost Inversion:** When PaaS monthly bills exceed the cost of 3 full-time DevOps engineers + hardware lease (approx. $15k-$20k/mo).
2.  **Hardware Dependency:** If features require specialized hardware (e.g., GPU for AI-based "Vibe Matching") not standard in PaaS.
3.  **Latency Sensitivity:** Requirement for <5ms internal latency (e.g., real-time bidding for tickets), necessitating private networking (VPC).

### Implementation (Hybrid Approach)
*   **Step 1:** Keep stateless frontend/API on PaaS (Edge).
*   **Step 2:** Move "Hot" DB to managed bare metal (AWS/GCP/DigitalOcean) for raw IOPS.
*   **Step 3:** Containerize via Kubernetes (EKS/GKE) only when service complexity (Microservices) justifies the orchestration overhead.

## 3. Business Scaling Metrics
*   **CAC vs. LTV:** Ensure infrastructure cost per user < 10% of Lifetime Value.
*   **SLA:** Move to Custom Server if 99.99% uptime (Four Nines) is contractually required by enterprise organizers.
