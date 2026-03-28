export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export type Category = {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
};

export type TopicContent = {
  overview: string;
  keyPoints: string[];
  explanation: string;
  codeExample?: { title: string; code: string };
  pros?: string[];
  cons?: string[];
  realWorld?: string[];
};

export type Topic = {
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  icon: string;
  content: TopicContent;
};

export const categories: Category[] = [
  { id: "fundamentals", label: "Fundamentals", icon: "📐", color: "blue", description: "Core concepts every engineer should know" },
  { id: "scalability", label: "Scalability", icon: "📈", color: "emerald", description: "Techniques to handle growing traffic" },
  { id: "load-balancing", label: "Load Balancing", icon: "⚖️", color: "purple", description: "Distributing traffic across servers" },
  { id: "databases", label: "Databases", icon: "🗄️", color: "orange", description: "Storage, querying, and data management" },
  { id: "caching", label: "Caching", icon: "⚡", color: "yellow", description: "Speed up reads with in-memory storage" },
  { id: "networking", label: "Networking & CDN", icon: "🌐", color: "cyan", description: "Content delivery and network protocols" },
  { id: "messaging", label: "Messaging", icon: "📨", color: "pink", description: "Asynchronous communication between services" },
  { id: "distributed", label: "Distributed Systems", icon: "🔗", color: "red", description: "Coordination across multiple machines" },
  { id: "patterns", label: "Design Patterns", icon: "🧩", color: "indigo", description: "Proven architectural solutions" },
  { id: "real-world", label: "Real-World Systems", icon: "🏢", color: "violet", description: "Design famous large-scale systems" },
];

export const topics: Topic[] = [
  // ── Fundamentals ──────────────────────────────────────────
  {
    slug: "dns",
    title: "DNS (Domain Name System)",
    description: "How domain names are translated to IP addresses across the internet",
    category: "fundamentals",
    difficulty: "Beginner",
    icon: "🌍",
    content: {
      overview: "DNS is the internet's phonebook. It translates human-readable domain names like google.com into machine-readable IP addresses like 142.250.80.46, enabling browsers to locate and connect to web servers.",
      keyPoints: [
        "DNS uses a hierarchical structure: Root servers → TLD servers (.com, .org) → Authoritative name servers",
        "Results are cached at multiple levels: browser, OS, ISP resolver, and recursive resolvers",
        "TTL (Time to Live) controls how long DNS records are cached before re-querying",
        "Common record types: A (IPv4), AAAA (IPv6), CNAME (alias), MX (mail), NS (nameserver)",
        "DNS resolution typically takes 20-120ms for uncached lookups",
      ],
      explanation: "When you type a URL into your browser, a DNS lookup is the first step. The browser checks its own cache, then the OS cache, then queries a recursive DNS resolver (usually your ISP's).\n\nThe recursive resolver walks the DNS hierarchy: it asks a root server which TLD server handles .com, then asks the TLD server which authoritative server handles google.com, and finally gets the IP address from the authoritative server.\n\nTo reduce latency, DNS responses are aggressively cached. Most sites set TTLs between 60 seconds and 24 hours. Services like Cloudflare and AWS Route 53 also support GeoDNS, which returns different IP addresses based on the user's geographic location.",
      codeExample: {
        title: "DNS Lookup in Node.js",
        code: `const dns = require('dns');

// Resolve a domain to its IP addresses
dns.resolve4('google.com', (err, addresses) => {
  console.log('IP addresses:', addresses);
  // ['142.250.80.46']
});

// Reverse lookup: IP → hostname
dns.reverse('8.8.8.8', (err, hostnames) => {
  console.log('Hostnames:', hostnames);
  // ['dns.google']
});`,
      },
      pros: ["Decentralized and fault-tolerant by design", "Cached at multiple levels for speed", "Supports geographic routing via GeoDNS"],
      cons: ["DNS propagation can take up to 48 hours", "Vulnerable to DNS spoofing and cache poisoning", "Single point of failure if DNS provider goes down"],
      realWorld: ["Every web application relies on DNS", "CDNs use GeoDNS to route users to nearest edge", "Email routing uses MX records"],
    },
  },
  {
    slug: "latency-throughput",
    title: "Latency & Throughput",
    description: "Two fundamental performance metrics for measuring system speed and capacity",
    category: "fundamentals",
    difficulty: "Beginner",
    icon: "⏱️",
    content: {
      overview: "Latency is the time it takes for a single request to travel from client to server and back. Throughput is the number of requests a system can handle per unit of time. Together they define a system's performance characteristics.",
      keyPoints: [
        "Latency = time for one operation (measured in ms). Lower is better",
        "Throughput = operations per second (measured in RPS/QPS). Higher is better",
        "They are related but not inversely proportional — optimizing one doesn't always improve the other",
        "P99 latency (99th percentile) matters more than average latency in production",
        "Network latency dominates in distributed systems: same datacenter ~0.5ms, cross-continent ~150ms",
      ],
      explanation: "Think of a highway: latency is how long it takes one car to drive from point A to point B. Throughput is how many cars pass per hour. A wider highway (more lanes) increases throughput but doesn't change the drive time (latency).\n\nIn system design, you must consider both. A system with low latency but low throughput can handle individual requests fast but collapses under load. A system with high throughput but high latency can serve many users but each one waits a long time.\n\nCommon latency numbers every engineer should know: L1 cache reference (~0.5ns), RAM access (~100ns), SSD read (~150μs), HDD seek (~10ms), round trip within same datacenter (~0.5ms), California to Netherlands round trip (~150ms).",
      codeExample: {
        title: "Measuring Latency in JavaScript",
        code: `// Measure API latency
async function measureLatency(url) {
  const start = performance.now();
  await fetch(url);
  const end = performance.now();

  const latencyMs = end - start;
  console.log(\`Latency: \${latencyMs.toFixed(2)}ms\`);
  return latencyMs;
}

// Track P99 latency
class LatencyTracker {
  constructor() { this.samples = []; }

  record(ms) { this.samples.push(ms); }

  getP99() {
    const sorted = [...this.samples].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.99);
    return sorted[idx];
  }
}`,
      },
      pros: ["Easy to measure and monitor", "Clear optimization targets", "Universally understood metrics"],
      cons: ["Averages can hide tail latency issues", "Throughput can be misleading under low load", "Trade-offs often exist between the two"],
      realWorld: ["Google aims for <200ms search latency", "Amazon found every 100ms latency costs 1% sales", "Trading systems optimize for microsecond latency"],
    },
  },
  {
    slug: "cap-theorem",
    title: "CAP Theorem",
    description: "The fundamental trade-off between consistency, availability, and partition tolerance",
    category: "fundamentals",
    difficulty: "Intermediate",
    icon: "🔺",
    content: {
      overview: "The CAP theorem states that a distributed system can provide at most two of three guarantees simultaneously: Consistency (every read gets the most recent write), Availability (every request gets a response), and Partition Tolerance (the system continues to operate despite network failures).",
      keyPoints: [
        "In practice, network partitions are inevitable, so the real choice is between CP and AP",
        "CP systems (e.g., HBase, MongoDB) sacrifice availability during partitions to maintain consistency",
        "AP systems (e.g., Cassandra, DynamoDB) sacrifice consistency during partitions to stay available",
        "Many real systems offer tunable consistency — you choose per query or per table",
        "PACELC extends CAP: when no Partition, do you optimize for Latency or Consistency?",
      ],
      explanation: "Imagine a distributed database replicated across two data centers. If the network link between them breaks (partition), you have two choices:\n\n1. CP: Reject writes to one side to keep data consistent. Both sides always return the same data, but one side becomes unavailable for writes.\n\n2. AP: Accept writes on both sides independently. Both sides remain available, but they may return different (inconsistent) data until the partition heals.\n\nMost modern systems don't fall neatly into CP or AP. They offer tunable consistency levels. For example, Cassandra lets you choose QUORUM reads (more consistent) or ONE reads (more available) per query.",
      realWorld: ["Banking systems are typically CP — consistency of balances is critical", "Social media feeds are typically AP — a slightly stale feed is acceptable", "DNS is AP — cached records may be stale but the system stays available"],
    },
  },
  {
    slug: "acid-properties",
    title: "ACID Properties",
    description: "Four guarantees that ensure reliable database transactions",
    category: "fundamentals",
    difficulty: "Beginner",
    icon: "🧪",
    content: {
      overview: "ACID stands for Atomicity, Consistency, Isolation, and Durability — four properties that guarantee database transactions are processed reliably, even in the face of errors, power failures, or concurrent access.",
      keyPoints: [
        "Atomicity: A transaction is all-or-nothing. If any part fails, the entire transaction rolls back",
        "Consistency: A transaction moves the database from one valid state to another, enforcing all rules and constraints",
        "Isolation: Concurrent transactions execute as if they were sequential — each is unaware of others",
        "Durability: Once a transaction is committed, the data persists even if the system crashes",
        "Isolation levels trade off between correctness and performance: READ UNCOMMITTED → READ COMMITTED → REPEATABLE READ → SERIALIZABLE",
      ],
      explanation: "Consider a bank transfer of $100 from Account A to Account B. Without ACID:\n- Without Atomicity: A is debited but B is never credited — money vanishes.\n- Without Consistency: The total balance across accounts changes — invariants break.\n- Without Isolation: A concurrent read sees A debited but B not yet credited.\n- Without Durability: After a crash, the successful transfer is lost.\n\nRelational databases like PostgreSQL and MySQL provide full ACID compliance. NoSQL databases often relax one or more properties for better performance or scalability — this is known as BASE (Basically Available, Soft state, Eventual consistency).",
      codeExample: {
        title: "ACID Transaction in SQL",
        code: `-- Transfer $100 from account A to account B
BEGIN TRANSACTION;

UPDATE accounts SET balance = balance - 100
  WHERE id = 'A' AND balance >= 100;

-- If the debit failed (insufficient funds), roll back
-- Otherwise credit account B
UPDATE accounts SET balance = balance + 100
  WHERE id = 'B';

-- Both updates succeed or neither does (Atomicity)
COMMIT;`,
      },
      pros: ["Guarantees data correctness", "Prevents partial updates and data corruption", "Well-understood model with decades of tooling"],
      cons: ["Strict isolation reduces concurrency and throughput", "Distributed ACID (2PC) is expensive and slow", "Can cause deadlocks under heavy contention"],
      realWorld: ["Banking and financial systems", "E-commerce order processing", "Inventory management systems"],
    },
  },
  {
    slug: "back-of-envelope",
    title: "Back-of-the-Envelope Estimation",
    description: "Quick calculations to estimate system capacity and resource requirements",
    category: "fundamentals",
    difficulty: "Intermediate",
    icon: "🧮",
    content: {
      overview: "Back-of-the-envelope estimation is a technique to quickly calculate system requirements using rough approximations. It helps engineers make informed decisions about architecture, capacity planning, and feasibility without exact measurements.",
      keyPoints: [
        "Key numbers: 1 day = 86,400s ≈ 100K seconds. 1 year ≈ 30 million seconds",
        "Storage: 1 char = 1 byte, 1 int = 4 bytes, a typical tweet ≈ 300 bytes, a photo ≈ 200KB, a video ≈ 5MB/min",
        "QPS estimation: DAU × actions/user/day ÷ 86,400 = average QPS. Peak = 2-5× average",
        "The power of 2: 2^10 = 1K, 2^20 = 1M, 2^30 = 1G, 2^40 = 1T",
        "A single server can typically handle 1K-10K concurrent connections",
      ],
      explanation: "Example: Estimate storage for a Twitter-like service.\n\nAssumptions: 300M MAU, 50% DAU = 150M, each user tweets 2x/day, 10% have media.\nDaily tweets: 150M × 2 = 300M tweets/day\nText storage: 300M × 300 bytes = 90GB/day\nMedia storage: 30M × 200KB = 6TB/day\nTotal: ~6TB/day, ~2PB/year\n\nExample: Estimate QPS for the same service.\nDaily tweets: 300M. QPS = 300M / 86400 ≈ 3,500 write QPS\nReads are typically 100× writes: ~350K read QPS\nPeak (3× average): ~1M read QPS → need significant caching and load balancing.",
      realWorld: ["System design interviews always involve estimation", "Capacity planning for new features", "Cost estimation for cloud infrastructure"],
    },
  },
  {
    slug: "rest-api-design",
    title: "REST API Design",
    description: "Principles for designing clean, predictable, and scalable HTTP APIs",
    category: "fundamentals",
    difficulty: "Beginner",
    icon: "🔌",
    content: {
      overview: "REST (Representational State Transfer) is an architectural style for designing networked applications. It uses standard HTTP methods to perform CRUD operations on resources identified by URLs, making APIs intuitive, stateless, and cacheable.",
      keyPoints: [
        "Use nouns for resources, not verbs: /users, /orders — not /getUsers, /createOrder",
        "HTTP methods map to CRUD: GET (read), POST (create), PUT (update), PATCH (partial update), DELETE (remove)",
        "Use proper status codes: 200 (OK), 201 (Created), 400 (Bad Request), 404 (Not Found), 500 (Server Error)",
        "APIs should be stateless — each request contains all information needed to process it",
        "Version your API: /api/v1/users — breaking changes go in a new version",
      ],
      explanation: "A well-designed REST API treats URLs as resource identifiers and HTTP methods as actions. Instead of creating custom endpoints like /getUserById?id=5 or /deleteUser?id=5, use the same URL /users/5 with different HTTP methods: GET to read, DELETE to remove.\n\nPagination, filtering, and sorting should use query parameters: /users?page=2&limit=20&sort=name. Nested resources model relationships: /users/5/orders returns orders for user 5.\n\nFor error responses, always include a structured body with an error code and human-readable message. This makes debugging easier for API consumers.",
      codeExample: {
        title: "Express.js REST API",
        code: `const express = require('express');
const app = express();

// GET /api/users - List all users
app.get('/api/users', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const users = db.users.paginate(page, limit);
  res.json({ data: users, page, limit });
});

// GET /api/users/:id - Get single user
app.get('/api/users/:id', (req, res) => {
  const user = db.users.findById(req.params.id);
  if (!user) return res.status(404).json({
    error: 'User not found'
  });
  res.json(user);
});

// POST /api/users - Create user
app.post('/api/users', (req, res) => {
  const user = db.users.create(req.body);
  res.status(201).json(user);
});`,
      },
      pros: ["Simple and universally understood", "Stateless — easy to scale horizontally", "Cacheable with HTTP standards"],
      cons: ["Over-fetching: endpoints return fixed data shapes", "Under-fetching: may need multiple requests for related data", "No built-in real-time support"],
      realWorld: ["GitHub API", "Stripe Payments API", "Twitter/X API"],
    },
  },
  // ── Scalability ───────────────────────────────────────────
  {
    slug: "vertical-scaling",
    title: "Vertical Scaling (Scale Up)",
    description: "Adding more power to a single machine — more CPU, RAM, or storage",
    category: "scalability",
    difficulty: "Beginner",
    icon: "⬆️",
    content: {
      overview: "Vertical scaling means upgrading a single server's hardware — adding more CPU cores, RAM, faster SSDs, or better network cards. It's the simplest way to handle increased load but has hard upper limits.",
      keyPoints: [
        "Simplest approach: no code changes needed, just upgrade the hardware",
        "Hard ceiling: even the most powerful single server has physical limits",
        "Single point of failure: one server going down means complete outage",
        "Cost scales non-linearly: doubling specs often more than doubles cost",
        "Good for databases and stateful workloads that are hard to distribute",
      ],
      explanation: "Vertical scaling is often the first approach because it requires zero architectural changes. If your PostgreSQL database is slow, upgrading from 16GB to 64GB of RAM and adding faster SSDs can provide immediate relief.\n\nHowever, vertical scaling hits a wall. The most powerful single AWS instance (u-24tb1.metal) has 448 vCPUs and 24TB RAM. Beyond that, you must go horizontal. More importantly, a single machine is a single point of failure — no matter how powerful it is, hardware eventually fails.\n\nVertical scaling makes sense early on (startups, MVPs) and for workloads that are inherently hard to distribute, like relational databases with complex joins.",
      pros: ["No code changes required", "No distributed system complexity", "Lower operational overhead"],
      cons: ["Hard upper limit on hardware specs", "Single point of failure", "Non-linear cost increase", "Requires downtime for upgrades"],
      realWorld: ["Upgrading a database server's RAM", "Moving to a larger EC2 instance", "Adding GPUs for ML workloads"],
    },
  },
  {
    slug: "horizontal-scaling",
    title: "Horizontal Scaling (Scale Out)",
    description: "Adding more machines to distribute load across a fleet of servers",
    category: "scalability",
    difficulty: "Beginner",
    icon: "➡️",
    content: {
      overview: "Horizontal scaling means adding more machines to your pool of resources rather than upgrading a single machine. It provides virtually unlimited scaling capacity, built-in redundancy, and is the foundation of modern cloud-native architectures.",
      keyPoints: [
        "Add more servers behind a load balancer to handle more traffic",
        "No hard ceiling — you can keep adding machines as needed",
        "Built-in redundancy: if one server fails, others continue serving",
        "Requires stateless application design or externalized state (Redis, database)",
        "Cloud auto-scaling makes horizontal scaling dynamic and cost-efficient",
      ],
      explanation: "With horizontal scaling, instead of one powerful server, you run many smaller servers behind a load balancer. When traffic increases, you add more servers. When it decreases, you remove them.\n\nThe key requirement is stateless design — individual servers should not store user sessions or application state locally. Instead, externalize state to shared stores like Redis (sessions), S3 (files), or a database (persistent data). This way, any server can handle any request.\n\nCloud platforms make horizontal scaling nearly effortless with auto-scaling groups that add/remove instances based on CPU usage, memory, or custom metrics. Kubernetes takes this further with pod auto-scaling.",
      codeExample: {
        title: "Stateless Express Server (Scaling-Ready)",
        code: `const express = require('express');
const Redis = require('ioredis');
const app = express();

// Externalize session state to Redis
// Any server instance can serve any user
const redis = new Redis(process.env.REDIS_URL);

app.post('/api/login', async (req, res) => {
  const user = await authenticate(req.body);
  const token = generateToken(user);

  // Store session in Redis, not in server memory
  await redis.set(\`session:\${token}\`, JSON.stringify(user),
    'EX', 3600);

  res.json({ token });
});

app.get('/api/profile', async (req, res) => {
  const token = req.headers.authorization;
  // Any server can retrieve this session
  const user = JSON.parse(
    await redis.get(\`session:\${token}\`)
  );
  res.json(user);
});`,
      },
      pros: ["Near-unlimited scaling capacity", "Built-in fault tolerance and redundancy", "Cost-efficient with auto-scaling"],
      cons: ["Requires stateless application design", "Adds complexity: load balancers, service discovery", "Data consistency is harder across multiple nodes"],
      realWorld: ["Netflix scales to 200M+ users with thousands of instances", "Auto-scaling groups in AWS/GCP/Azure", "Kubernetes pod auto-scaling"],
    },
  },
  {
    slug: "microservices",
    title: "Microservices Architecture",
    description: "Breaking a monolith into independently deployable services with clear boundaries",
    category: "scalability",
    difficulty: "Intermediate",
    icon: "🧱",
    content: {
      overview: "Microservices architecture decomposes an application into small, independently deployable services, each owning a specific business capability. Services communicate via APIs and can be developed, deployed, and scaled independently.",
      keyPoints: [
        "Each service owns its data and business logic — no shared databases",
        "Services communicate via REST, gRPC, or message queues",
        "Independent deployment: update one service without redeploying the entire app",
        "Scale individually: scale the payment service differently from the user service",
        "Organizational alignment: each team owns one or more services end-to-end",
      ],
      explanation: "In a monolith, all code lives in one deployable unit. Changing the payment logic requires redeploying the entire application, including user management, notifications, and search. In microservices, each concern is a separate service.\n\nThe key design principle is bounded contexts from Domain-Driven Design. Each service has clear boundaries and owns its own database. The user service has a user DB, the order service has an orders DB. They communicate through well-defined APIs, not shared database tables.\n\nThis independence comes at a cost: network calls replace function calls, distributed transactions are hard, and you need infrastructure for service discovery, load balancing, monitoring, and tracing.",
      pros: ["Independent scaling and deployment per service", "Technology flexibility — each service can use different tech", "Teams can work independently without code conflicts"],
      cons: ["Distributed system complexity (networking, consistency)", "Operational overhead: monitoring, tracing, deployment pipelines", "Inter-service communication latency"],
      realWorld: ["Netflix has 700+ microservices", "Amazon migrated from monolith to microservices in the 2000s", "Uber's architecture spans thousands of microservices"],
    },
  },
  {
    slug: "stateless-architecture",
    title: "Stateless Architecture",
    description: "Designing servers that don't store session state, enabling easy horizontal scaling",
    category: "scalability",
    difficulty: "Intermediate",
    icon: "🔄",
    content: {
      overview: "A stateless architecture ensures no individual server stores user session data. Instead, state is externalized to shared datastores like Redis or databases. This allows any server to handle any request, making horizontal scaling trivial.",
      keyPoints: [
        "Servers are interchangeable — any server can handle any request from any user",
        "Session data stored in Redis, database, or encoded in JWT tokens",
        "Load balancers don't need sticky sessions — requests can go to any server",
        "Servers can be added/removed freely without migrating state",
        "Simplifies deployment: rolling updates just swap servers in and out",
      ],
      explanation: "In a stateful design, if User A logs in on Server 1, their session lives in Server 1's memory. All subsequent requests from User A must go to Server 1 (sticky sessions). If Server 1 crashes, User A's session is lost.\n\nIn a stateless design, User A's session is stored in Redis. Any server can look up the session by token. Servers become commodity — you can spin up 10 more or shut down 5, and nothing breaks.\n\nTwo common approaches: (1) Server-side sessions in Redis — simple, flexible, supports revocation. (2) JWT tokens — no server-side storage needed, but harder to revoke and tokens can grow large.",
      pros: ["Trivial horizontal scaling", "No sticky sessions needed", "Server failures don't lose user state"],
      cons: ["External state store becomes a dependency", "Slight latency overhead for external lookups", "JWT tokens can become large with many claims"],
      realWorld: ["AWS Lambda functions are inherently stateless", "Kubernetes pods are designed to be stateless", "12-Factor App methodology mandates stateless processes"],
    },
  },
  // ── Load Balancing ────────────────────────────────────────
  {
    slug: "load-balancer",
    title: "Load Balancer Fundamentals",
    description: "Distributing traffic across multiple servers for reliability and performance",
    category: "load-balancing",
    difficulty: "Beginner",
    icon: "⚖️",
    content: {
      overview: "A load balancer sits between clients and a pool of backend servers, distributing incoming requests to ensure no single server is overwhelmed. It improves availability, reliability, and enables horizontal scaling.",
      keyPoints: [
        "Distributes traffic using algorithms: Round Robin, Least Connections, IP Hash, Weighted",
        "Health checks detect unhealthy servers and stop routing traffic to them",
        "L4 (Transport layer) balancers route based on IP/port; L7 (Application layer) can inspect HTTP headers and URLs",
        "Can terminate TLS/SSL, offloading encryption from backend servers",
        "Common solutions: Nginx, HAProxy, AWS ALB/NLB, Cloudflare",
      ],
      explanation: "Without a load balancer, all traffic hits a single server. That server becomes both a performance bottleneck and a single point of failure. A load balancer solves both problems by distributing requests across multiple servers.\n\nL4 load balancers operate at the TCP/UDP level — they're fast but can only route based on IP addresses and ports. L7 load balancers understand HTTP — they can route based on URL paths (/api/* → API servers, /static/* → CDN), headers, or cookies.\n\nHealth checks are critical. The load balancer periodically pings each backend server (e.g., GET /health). If a server doesn't respond, it's removed from the pool. When it recovers, it's added back.",
      codeExample: {
        title: "Nginx Load Balancer Configuration",
        code: `# /etc/nginx/nginx.conf
upstream backend {
    # Weighted round-robin
    server 10.0.0.1:8080 weight=3;
    server 10.0.0.2:8080 weight=2;
    server 10.0.0.3:8080 weight=1;

    # Health check: mark down after 3 failures
    # retry after 30 seconds
    server 10.0.0.4:8080 max_fails=3
                          fail_timeout=30s;
}

server {
    listen 80;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        return 200 'OK';
    }
}`,
      },
      pros: ["Eliminates single points of failure", "Enables horizontal scaling", "Provides SSL termination and request routing"],
      cons: ["Adds latency (extra network hop)", "Load balancer itself can become a bottleneck", "Configuration complexity for L7 routing"],
      realWorld: ["AWS ALB for web applications", "Nginx as a reverse proxy", "Cloudflare for global load balancing"],
    },
  },
  {
    slug: "lb-algorithms",
    title: "Load Balancing Algorithms",
    description: "Strategies for deciding which server receives each incoming request",
    category: "load-balancing",
    difficulty: "Intermediate",
    icon: "🎯",
    content: {
      overview: "Load balancing algorithms determine how incoming requests are distributed across servers. The choice of algorithm impacts performance, resource utilization, and user experience. Different workloads benefit from different strategies.",
      keyPoints: [
        "Round Robin: requests go to servers in sequential rotation — simple but ignores server load",
        "Weighted Round Robin: assigns more requests to more powerful servers",
        "Least Connections: sends traffic to the server with fewest active connections",
        "IP Hash: same client IP always goes to same server — good for session affinity",
        "Least Response Time: routes to the server responding fastest",
      ],
      explanation: "Round Robin is the simplest: Server 1, Server 2, Server 3, Server 1, Server 2... It works well when servers are identical and requests are similar in cost. But if one server is handling a long query, it still gets the next request.\n\nLeast Connections is smarter for variable workloads. If Server 1 has 50 active connections and Server 2 has 10, the next request goes to Server 2. This naturally adapts to servers with different capacities or workloads.\n\nIP Hash uses a hash of the client's IP to deterministically assign them to a server. This provides session affinity without sticky sessions, but causes imbalanced distribution if many clients share an IP (e.g., behind corporate NAT).",
      pros: ["Right algorithm dramatically improves resource utilization", "Can be tuned for specific workload patterns", "Most load balancers support multiple algorithms"],
      cons: ["No single algorithm is optimal for all workloads", "Some algorithms require tracking server state (connections, response times)", "Hash-based algorithms can create hotspots"],
      realWorld: ["CDNs use geographic + least connections", "API gateways often use round robin", "Database proxies use least connections"],
    },
  },
  {
    slug: "health-checks",
    title: "Health Checks & Failover",
    description: "Detecting unhealthy servers and automatically rerouting traffic",
    category: "load-balancing",
    difficulty: "Beginner",
    icon: "💓",
    content: {
      overview: "Health checks are periodic probes sent by load balancers to backend servers to verify they're functioning correctly. Unhealthy servers are automatically removed from the pool, and traffic is rerouted to healthy ones — this is failover.",
      keyPoints: [
        "Active health checks: load balancer pings servers periodically (GET /health)",
        "Passive health checks: monitor actual request failures to detect issues",
        "Health endpoints should check dependencies: database, cache, external APIs",
        "Grace periods prevent flapping: don't remove a server for one failed check",
        "Readiness vs liveness: 'ready to serve' vs 'process is alive' are different checks",
      ],
      explanation: "A basic health check is an HTTP endpoint that returns 200 OK when the server is healthy. But a smart health check also verifies dependencies — if the database connection is down, the server should report unhealthy even though the process is running.\n\nKubernetes distinguishes between liveness probes (is the process alive? restart if not) and readiness probes (is it ready to serve traffic? remove from service if not). A server can be alive but not ready — for example, during startup while loading data into memory.\n\nFailover strategies: Active-passive (standby server takes over on failure) and Active-active (all servers handle traffic, load redistributed on failure).",
      codeExample: {
        title: "Health Check Endpoint",
        code: `app.get('/health', async (req, res) => {
  const checks = {
    server: 'ok',
    database: 'unknown',
    redis: 'unknown',
  };

  try {
    await db.query('SELECT 1');
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  const healthy = Object.values(checks)
    .every(s => s === 'ok');
  res.status(healthy ? 200 : 503).json(checks);
});`,
      },
      realWorld: ["Kubernetes liveness/readiness probes", "AWS ALB target group health checks", "Docker HEALTHCHECK instruction"],
    },
  },
  // ── Databases ─────────────────────────────────────────────
  {
    slug: "sql-vs-nosql",
    title: "SQL vs NoSQL Databases",
    description: "Choosing between relational and non-relational databases based on your use case",
    category: "databases",
    difficulty: "Intermediate",
    icon: "📊",
    content: {
      overview: "SQL databases (PostgreSQL, MySQL) store data in structured tables with predefined schemas and support complex queries with joins. NoSQL databases (MongoDB, Cassandra, Redis) offer flexible schemas, horizontal scalability, and are optimized for specific access patterns.",
      keyPoints: [
        "SQL: structured schema, ACID transactions, powerful joins, vertical scaling",
        "NoSQL types: Document (MongoDB), Key-Value (Redis), Column-Family (Cassandra), Graph (Neo4j)",
        "Choose SQL when you need complex queries, transactions, and data integrity",
        "Choose NoSQL when you need flexible schemas, massive scale, or specific data models",
        "Many modern systems use both (polyglot persistence) — SQL for transactions, NoSQL for caching/search",
      ],
      explanation: "SQL databases enforce a rigid schema: every row in a table has the same columns. This makes queries powerful (JOIN users ON orders.user_id = users.id) but schema changes require migrations. They excel at complex queries and ACID transactions.\n\nNoSQL databases trade structure for flexibility. MongoDB stores JSON documents — each document can have different fields. Cassandra distributes data across nodes for massive write throughput. Redis keeps everything in memory for sub-millisecond reads.\n\nThe choice depends on your access patterns. If you're building an e-commerce site with complex inventory queries, SQL is likely better. If you're building a chat app that needs to store billions of messages and scale horizontally, a NoSQL database like Cassandra may be more appropriate.",
      pros: ["SQL: mature tooling, ACID, complex queries", "NoSQL: flexible schema, horizontal scale, high throughput"],
      cons: ["SQL: harder to scale horizontally, rigid schema", "NoSQL: limited joins, eventual consistency, less tooling"],
      realWorld: ["PostgreSQL for transactional workloads", "MongoDB for content management", "Redis for caching and sessions", "Cassandra for time-series data at scale"],
    },
  },
  {
    slug: "database-indexing",
    title: "Database Indexing",
    description: "Using data structures to speed up query performance at the cost of write overhead",
    category: "databases",
    difficulty: "Intermediate",
    icon: "📇",
    content: {
      overview: "A database index is a data structure (typically a B-tree or hash table) that speeds up data retrieval operations. Without an index, the database must scan every row in a table (full table scan). With an index, it can jump directly to the matching rows.",
      keyPoints: [
        "B-tree indexes: ordered, support range queries (WHERE age > 25), most common type",
        "Hash indexes: exact match only (WHERE email = 'x'), faster for equality but no ranges",
        "Composite indexes: multiple columns (name, age) — column order matters for query optimization",
        "Trade-off: indexes speed up reads but slow down writes (index must be updated on every insert/update)",
        "EXPLAIN ANALYZE reveals whether queries use indexes or full table scans",
      ],
      explanation: "Think of an index like a book's index. Without it, finding a topic requires reading every page. With it, you look up the term and jump directly to the right page.\n\nA B-tree index keeps data sorted in a balanced tree structure. Finding a value in a table of 1 million rows takes ~20 comparisons (log2(1M)) instead of scanning all 1M rows. This is the difference between a 1ms query and a 1-second query.\n\nBe strategic about indexing. Every index consumes storage and slows down writes. Index columns that appear in WHERE clauses, JOIN conditions, and ORDER BY. Don't index columns with low cardinality (e.g., a boolean 'active' column with only 2 values).",
      codeExample: {
        title: "Creating and Using Indexes",
        code: `-- Create an index on the email column
CREATE INDEX idx_users_email ON users(email);

-- Composite index for common query pattern
CREATE INDEX idx_orders_user_date
  ON orders(user_id, created_at DESC);

-- Check if a query uses the index
EXPLAIN ANALYZE
  SELECT * FROM users WHERE email = 'user@test.com';
-- Output: Index Scan using idx_users_email
--         (cost=0.29..8.31 rows=1)

-- Partial index: only index active users
CREATE INDEX idx_active_users
  ON users(email) WHERE active = true;`,
      },
      pros: ["Dramatically speeds up read queries (100-1000x)", "Enables efficient sorting and range queries", "Partial indexes reduce storage overhead"],
      cons: ["Slows down INSERT/UPDATE/DELETE operations", "Consumes additional storage space", "Too many indexes can hurt overall performance"],
      realWorld: ["Every production database uses indexes", "Full-text search indexes (Elasticsearch, PostgreSQL tsvector)", "Geospatial indexes for location queries"],
    },
  },
  {
    slug: "database-replication",
    title: "Database Replication",
    description: "Copying data across multiple servers for availability, redundancy, and read scaling",
    category: "databases",
    difficulty: "Intermediate",
    icon: "📋",
    content: {
      overview: "Database replication copies data from a primary (master) database to one or more replicas (slaves). The primary handles all writes, while replicas serve read queries. This improves read performance, provides redundancy, and enables geographic distribution.",
      keyPoints: [
        "Master-slave: one primary handles writes, replicas handle reads",
        "Synchronous replication: replica confirms write before primary responds — consistent but slower",
        "Asynchronous replication: primary responds immediately, replica catches up later — faster but may have stale reads",
        "Failover: if master dies, a replica is promoted to master (automatic or manual)",
        "Replication lag: the delay between a write on master and its appearance on replicas",
      ],
      explanation: "Most applications are read-heavy (90-99% reads). With a single database, the server handles both reads and writes. Replication lets you add read replicas to distribute the read load.\n\nWith 1 master and 3 replicas, your read capacity roughly quadruples. The master handles all writes and replicates changes to replicas asynchronously. Reads are distributed across replicas by a load balancer.\n\nThe main challenge is replication lag. If a user writes data and immediately reads it, the read might hit a replica that hasn't received the write yet. Solutions include reading from master after writes, using synchronous replication (at a performance cost), or using session-aware routing.",
      pros: ["Scales read capacity linearly with replicas", "High availability — replica can be promoted on master failure", "Geographic distribution reduces latency for global users"],
      cons: ["Replication lag causes stale reads", "Write capacity is still limited to the master", "Failover can cause brief data loss with async replication"],
      realWorld: ["Amazon RDS Multi-AZ uses synchronous replication for failover", "MySQL read replicas for read-heavy workloads", "PostgreSQL streaming replication"],
    },
  },
  {
    slug: "database-sharding",
    title: "Database Sharding",
    description: "Splitting data across multiple database instances using a shard key",
    category: "databases",
    difficulty: "Advanced",
    icon: "🔀",
    content: {
      overview: "Sharding horizontally partitions data across multiple database instances (shards). Each shard holds a subset of the data, determined by a shard key. This enables near-unlimited write and storage scaling, but adds significant complexity.",
      keyPoints: [
        "Each shard is an independent database holding a subset of data",
        "Shard key determines which shard holds each row: hash(user_id) % num_shards",
        "Range-based sharding: user IDs 1-1M → Shard 1, 1M-2M → Shard 2",
        "Hash-based sharding: hash(key) % N distributes evenly but makes range queries hard",
        "Resharding is painful: adding/removing shards requires data migration",
      ],
      explanation: "When a single database can't handle the write volume or data size, sharding splits the data across multiple databases. A user with ID 12345 might go to shard hash(12345) % 4 = Shard 1.\n\nThe critical decision is choosing the shard key. A good shard key distributes data evenly and allows most queries to target a single shard. For a social app, user_id is often a good shard key — most queries are about a specific user's data.\n\nBad shard keys create hotspots. Sharding by country puts 90% of data on one shard if most users are in one country. Celebrity problems also arise: sharding by user_id puts all of a celebrity's millions of followers' interactions on one shard.\n\nCross-shard queries (e.g., join data from two shards) are expensive and should be avoided through denormalization.",
      codeExample: {
        title: "Simple Sharding Logic",
        code: `class ShardRouter {
  constructor(shardCount) {
    this.shards = new Array(shardCount)
      .fill(null)
      .map((_, i) => new Database(\`shard_\${i}\`));
  }

  // Determine which shard owns this key
  getShard(userId) {
    const shardId = this.hash(userId)
      % this.shards.length;
    return this.shards[shardId];
  }

  async getUser(userId) {
    const shard = this.getShard(userId);
    return shard.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
  }

  hash(key) {
    // Consistent hash for better resharding
    let hash = 0;
    const str = String(key);
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }
}`,
      },
      pros: ["Virtually unlimited write and storage scaling", "Each shard can be on different hardware or regions", "Failure of one shard doesn't affect others"],
      cons: ["Resharding is extremely complex and risky", "Cross-shard queries are slow and complicated", "Application must be shard-aware", "Hotspot/celebrity problem with poor key choice"],
      realWorld: ["Instagram shards PostgreSQL by user ID", "Discord shards messages by channel ID", "Vitess provides sharding for MySQL (used by YouTube)"],
    },
  },
  {
    slug: "database-normalization",
    title: "Normalization vs Denormalization",
    description: "Organizing data to reduce redundancy vs duplicating data for read performance",
    category: "databases",
    difficulty: "Intermediate",
    icon: "📐",
    content: {
      overview: "Normalization organizes data to eliminate redundancy by splitting it into related tables (1NF, 2NF, 3NF). Denormalization intentionally introduces redundancy by duplicating data to avoid expensive joins and improve read performance.",
      keyPoints: [
        "Normalization: reduces data duplication, ensures consistency, requires joins for queries",
        "Denormalization: duplicates data for faster reads, risks data inconsistency",
        "Normalize for write-heavy, consistency-critical systems (banking, inventory)",
        "Denormalize for read-heavy, performance-critical systems (feeds, dashboards)",
        "Many systems start normalized and denormalize specific hot paths as needed",
      ],
      explanation: "In a normalized schema, a user's city is stored once in a cities table and referenced by city_id. Changing the city name updates one row. But querying a user with their city requires a JOIN.\n\nIn a denormalized schema, the city name is stored directly in the users table. No join needed for reads, but changing a city name requires updating every user in that city. This is the fundamental trade-off: write complexity vs read performance.\n\nThe rule of thumb: start normalized, then selectively denormalize the queries that are too slow. Use materialized views to denormalize automatically — the database maintains the denormalized view when source data changes.",
      pros: ["Normalized: single source of truth, easy updates, smaller storage", "Denormalized: faster reads, simpler queries, fewer joins"],
      cons: ["Normalized: slow reads with many joins, complex queries", "Denormalized: data inconsistency risk, larger storage, complex writes"],
      realWorld: ["E-commerce product catalogs (denormalized for read speed)", "Financial ledgers (normalized for accuracy)", "Social media feeds (denormalized for display speed)"],
    },
  },
  // ── Caching ───────────────────────────────────────────────
  {
    slug: "caching-fundamentals",
    title: "Caching Fundamentals",
    description: "Storing frequently accessed data in fast storage to reduce latency and database load",
    category: "caching",
    difficulty: "Beginner",
    icon: "💾",
    content: {
      overview: "Caching stores copies of frequently accessed data in a faster storage layer (typically RAM) so that future requests can be served without hitting the slower primary store (database, API). A well-implemented cache can reduce latency by 10-100x and cut database load by 80-90%.",
      keyPoints: [
        "Cache hit: data found in cache → fast response. Cache miss: data not in cache → query source, then store in cache",
        "Cache layers: browser → CDN → application cache (Redis) → database query cache",
        "Cache hit ratio: the percentage of requests served from cache. Target: 90%+ for hot data",
        "TTL (Time to Live): how long cached data remains valid before expiration",
        "The two hardest problems in CS: cache invalidation and naming things",
      ],
      explanation: "The principle is simple: keep hot data close and fast. RAM access is ~100ns, SSD is ~150μs, network round trip is ~0.5ms. Serving data from an in-memory cache like Redis (~0.1ms) is dramatically faster than a database query (~5-50ms).\n\nA typical caching flow: (1) Check cache for key. (2) If hit, return cached data. (3) If miss, query database, store result in cache with TTL, return data.\n\nThe hard part is cache invalidation — when the source data changes, the cache becomes stale. Strategies include: TTL-based expiration (simple, eventually consistent), write-through (update cache on every write), and event-driven invalidation (publish events when data changes).",
      codeExample: {
        title: "Cache-Aside Pattern with Redis",
        code: `async function getUser(userId) {
  const cacheKey = \`user:\${userId}\`;

  // 1. Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached); // Cache hit
  }

  // 2. Cache miss — query database
  const user = await db.query(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );

  // 3. Store in cache with 1-hour TTL
  await redis.set(cacheKey, JSON.stringify(user),
    'EX', 3600);

  return user;
}

// Invalidate on update
async function updateUser(userId, data) {
  await db.query('UPDATE users SET ...', data);
  await redis.del(\`user:\${userId}\`); // Bust cache
}`,
      },
      pros: ["10-100x latency reduction", "Reduces database load by 80-90%", "Improves application throughput"],
      cons: ["Cache invalidation is complex", "Stale data is possible", "Additional infrastructure to manage (Redis cluster)"],
      realWorld: ["Facebook caches billions of objects in Memcached", "Every CDN is a distributed cache", "Browser caching of static assets"],
    },
  },
  {
    slug: "cache-strategies",
    title: "Caching Strategies",
    description: "Patterns for reading and writing data through the cache layer",
    category: "caching",
    difficulty: "Intermediate",
    icon: "🔁",
    content: {
      overview: "Caching strategies define how data flows between the application, cache, and database. The right strategy depends on your read/write ratio, consistency requirements, and whether you can tolerate stale data.",
      keyPoints: [
        "Cache-Aside (Lazy Loading): app manages cache — read from cache, fall back to DB, populate cache on miss",
        "Read-Through: cache itself fetches from DB on miss — app always talks to cache",
        "Write-Through: writes go to cache first, cache synchronously writes to DB — consistent but slower writes",
        "Write-Behind (Write-Back): writes go to cache, cache asynchronously writes to DB — fast writes, risk of data loss",
        "Write-Around: writes go directly to DB, cache is populated only on reads — avoids caching rarely-read data",
      ],
      explanation: "Cache-Aside is the most common pattern. The application is responsible for reading from cache, handling misses by querying the database, and updating the cache. It's simple and gives the app full control.\n\nWrite-Through ensures the cache is always consistent with the database by writing to both on every update. The downside is higher write latency (two writes per operation).\n\nWrite-Behind (Write-Back) is the fastest for writes — data goes to cache immediately and is written to the database asynchronously in batches. This is great for write-heavy workloads but risks data loss if the cache fails before flushing to the database.\n\nIn practice, many systems combine strategies: Cache-Aside for reads with Write-Around for writes that are rarely read back.",
      pros: ["Cache-Aside: simple, handles failures gracefully", "Write-Through: cache always consistent", "Write-Behind: fastest write performance"],
      cons: ["Cache-Aside: initial requests always miss", "Write-Through: higher write latency", "Write-Behind: risk of data loss on cache failure"],
      realWorld: ["DynamoDB DAX uses read-through + write-through", "CPU caches use write-back strategy", "Application-level caching typically uses cache-aside"],
    },
  },
  {
    slug: "cache-eviction",
    title: "Cache Eviction Policies",
    description: "Strategies for deciding which cached data to remove when the cache is full",
    category: "caching",
    difficulty: "Intermediate",
    icon: "🗑️",
    content: {
      overview: "Cache eviction policies determine which entries to remove when the cache reaches its memory limit. The goal is to keep the most useful data cached while evicting data that's least likely to be requested again.",
      keyPoints: [
        "LRU (Least Recently Used): evicts the entry that hasn't been accessed for the longest time — most common",
        "LFU (Least Frequently Used): evicts the entry accessed the fewest times — good for stable hot sets",
        "FIFO (First In, First Out): evicts the oldest entry regardless of access pattern",
        "TTL-based: entries expire after a set time regardless of access — ensures freshness",
        "Random eviction: randomly selects an entry to remove — surprisingly effective and O(1)",
      ],
      explanation: "LRU is the default choice for most caching scenarios. It assumes recently accessed data is likely to be accessed again (temporal locality). Redis uses an approximated LRU by sampling random keys and evicting the least recently used among the sample.\n\nLFU is better when some items are consistently popular. A viral video should stay cached even if it wasn't accessed in the last minute. LFU tracks access counts and evicts the least popular item.\n\nIn practice, most systems use LRU with TTL. Every entry gets a maximum lifespan (TTL) for freshness, and LRU handles capacity limits. Redis supports multiple eviction policies configurable per instance.",
      codeExample: {
        title: "LRU Cache Implementation",
        code: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map(); // Map preserves insertion order
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    // Evict oldest if over capacity
    if (this.cache.size > this.capacity) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
  }
}`,
      },
      realWorld: ["Redis supports 8 eviction policies", "CPU L1/L2/L3 caches use variants of LRU", "CDNs use LRU + TTL for static assets"],
    },
  },
  {
    slug: "redis",
    title: "Redis",
    description: "In-memory data store used for caching, sessions, queues, and real-time features",
    category: "caching",
    difficulty: "Intermediate",
    icon: "🔴",
    content: {
      overview: "Redis is an in-memory data structure store that supports strings, hashes, lists, sets, sorted sets, streams, and more. It's used for caching, session management, real-time leaderboards, rate limiting, pub/sub messaging, and queues. With sub-millisecond latency, Redis handles millions of operations per second.",
      keyPoints: [
        "Data structures: Strings, Hashes, Lists, Sets, Sorted Sets, Streams, HyperLogLog",
        "Persistence options: RDB snapshots and AOF (Append Only File) for durability",
        "Pub/Sub for real-time messaging between services",
        "Lua scripting for atomic multi-step operations",
        "Redis Cluster provides horizontal scaling with automatic sharding",
      ],
      explanation: "Redis shines because it's more than a simple key-value store. Its data structures enable powerful patterns:\n\n- Sorted Sets for leaderboards: ZADD leaderboard 1500 'player1' — O(log N) insert and O(log N) ranking.\n- Lists for queues: LPUSH to enqueue, BRPOP to dequeue with blocking.\n- Sets for unique tracking: SADD to track unique visitors, SCARD to count them.\n- HyperLogLog for cardinality estimation: counts unique items with ~0.81% error using only 12KB of memory.\n\nRedis processes commands single-threaded, which eliminates race conditions for individual commands. For atomic multi-step operations, use Lua scripts or MULTI/EXEC transactions.",
      codeExample: {
        title: "Redis Patterns in Node.js",
        code: `const Redis = require('ioredis');
const redis = new Redis();

// Caching with TTL
await redis.set('user:123', JSON.stringify(user),
  'EX', 3600);
const cached = JSON.parse(await redis.get('user:123'));

// Leaderboard with Sorted Sets
await redis.zadd('leaderboard', 1500, 'alice');
await redis.zadd('leaderboard', 2200, 'bob');
// Top 10 players with scores
const top10 = await redis.zrevrange(
  'leaderboard', 0, 9, 'WITHSCORES'
);

// Rate limiter with sliding window
async function isRateLimited(userId, limit = 100) {
  const key = \`rate:\${userId}\`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  return count > limit;
}`,
      },
      pros: ["Sub-millisecond latency", "Rich data structures beyond key-value", "Pub/Sub for real-time features"],
      cons: ["Limited by available RAM", "Single-threaded for commands (CPU bound for complex ops)", "Data loss risk without persistence configured"],
      realWorld: ["Twitter uses Redis for timeline caching", "GitHub uses Redis for job queues (Resque)", "Snapchat uses Redis for stories"],
    },
  },
  // ── Networking & CDN ──────────────────────────────────────
  {
    slug: "cdn",
    title: "Content Delivery Network (CDN)",
    description: "Geographically distributed servers that cache and serve content close to users",
    category: "networking",
    difficulty: "Intermediate",
    icon: "🌐",
    content: {
      overview: "A CDN is a network of edge servers deployed across the globe that cache and serve static content (images, CSS, JS, videos) from locations close to users. This dramatically reduces latency and offloads traffic from your origin servers.",
      keyPoints: [
        "Edge servers cache static content close to users — a user in Tokyo gets content from a Tokyo edge server, not a US origin",
        "Pull CDN: edge fetches from origin on first request, caches for subsequent ones",
        "Push CDN: you upload content to the CDN proactively",
        "Cache-Control headers and TTL control how long edges cache content",
        "CDN invalidation: purge cached content when it changes (takes seconds to minutes globally)",
      ],
      explanation: "Without a CDN, every user request travels to your origin server, which might be in a single region. A user in Australia loading assets from a US server experiences ~200ms latency per request.\n\nWith a CDN, static assets are cached at 200+ edge locations worldwide. The Australian user gets assets from a Sydney edge server with ~20ms latency — a 10x improvement.\n\nModern CDNs go beyond static caching: Cloudflare Workers and AWS CloudFront Functions run serverless code at the edge. They can handle authentication, A/B testing, redirects, and API caching without going to the origin server.",
      pros: ["10x latency reduction for global users", "Offloads 60-90% of traffic from origin", "DDoS protection and SSL termination included"],
      cons: ["Stale content if invalidation is slow", "Cost per GB of bandwidth", "Complex cache key management for dynamic content"],
      realWorld: ["Netflix serves 90% of traffic through its Open Connect CDN", "Cloudflare, AWS CloudFront, Akamai, Fastly", "GitHub Pages uses Fastly CDN"],
    },
  },
  {
    slug: "websockets",
    title: "WebSockets",
    description: "Full-duplex communication channel for real-time data between client and server",
    category: "networking",
    difficulty: "Intermediate",
    icon: "🔌",
    content: {
      overview: "WebSockets provide a persistent, full-duplex communication channel over a single TCP connection. Unlike HTTP's request-response model, WebSockets allow both client and server to send messages at any time, making them ideal for real-time applications.",
      keyPoints: [
        "Full-duplex: both sides can send messages independently without waiting for a response",
        "Persistent connection: the connection stays open, eliminating the overhead of repeated HTTP handshakes",
        "Starts as HTTP upgrade request, then switches to WebSocket protocol (ws:// or wss://)",
        "Low overhead: 2-byte frame header vs HTTP's ~700 bytes of headers per request",
        "Scaling challenge: each connection consumes server memory; a single server can handle ~50K-100K connections",
      ],
      explanation: "HTTP is a request-response protocol. The client asks, the server answers. For real-time features like chat, live notifications, or collaborative editing, the server needs to push updates to the client without being asked. Polling (repeated HTTP requests) wastes bandwidth and adds latency.\n\nWebSockets solve this with a persistent connection. After the initial HTTP handshake, the connection upgrades to WebSocket. Both sides can send messages freely with minimal overhead.\n\nScaling WebSockets requires sticky sessions (a client must stay connected to the same server) or a pub/sub layer like Redis. When Server 1 receives a message for a user connected to Server 2, it publishes to Redis, and Server 2 delivers it.",
      codeExample: {
        title: "WebSocket Server & Client",
        code: `// Server (Node.js with 'ws' library)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    // Broadcast to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data.toString());
      }
    });
  });
});

// Client (Browser)
const ws = new WebSocket('ws://localhost:8080');
ws.onmessage = (event) => {
  console.log('Received:', event.data);
};
ws.send('Hello from client!');`,
      },
      pros: ["True real-time bidirectional communication", "Low latency and overhead after connection", "Efficient for high-frequency updates"],
      cons: ["Stateful connections are harder to scale", "Connection drops require reconnection logic", "Not all proxies/firewalls support WebSockets"],
      realWorld: ["Slack, Discord for real-time messaging", "Google Docs collaborative editing", "Live sports scores and stock tickers"],
    },
  },
  {
    slug: "api-gateway",
    title: "API Gateway",
    description: "A single entry point that routes, authenticates, and manages API traffic",
    category: "networking",
    difficulty: "Intermediate",
    icon: "🚪",
    content: {
      overview: "An API Gateway is a server that acts as the single entry point for all client requests. It handles cross-cutting concerns like authentication, rate limiting, request routing, response transformation, and monitoring — so individual services don't have to.",
      keyPoints: [
        "Single entry point: clients call one URL, the gateway routes to the right microservice",
        "Cross-cutting concerns: authentication, rate limiting, logging, CORS, TLS termination",
        "Request aggregation: combine responses from multiple services into a single API response",
        "Protocol translation: accept REST from clients, call gRPC internally",
        "Popular options: Kong, AWS API Gateway, Nginx, Envoy, Traefik",
      ],
      explanation: "In a microservices architecture, clients shouldn't need to know which service handles each request. Instead of calling user-service:3000/profile and order-service:3001/orders, the client calls api.example.com/profile and api.example.com/orders. The gateway routes each request to the correct service.\n\nThe gateway also centralizes authentication — verify the JWT token once at the gateway instead of in every service. Same for rate limiting: enforce rate limits at the edge before requests reach your services.\n\nThe Backend for Frontend (BFF) pattern takes this further: create separate gateways for web, mobile, and third-party clients, each aggregating data differently.",
      pros: ["Simplifies client code — one endpoint to call", "Centralizes auth, rate limiting, logging", "Enables protocol translation and response aggregation"],
      cons: ["Single point of failure if not highly available", "Adds latency (extra network hop)", "Can become a development bottleneck"],
      realWorld: ["AWS API Gateway for serverless APIs", "Netflix Zuul / Spring Cloud Gateway", "Kong for API management at scale"],
    },
  },
  // ── Messaging ─────────────────────────────────────────────
  {
    slug: "message-queues",
    title: "Message Queues",
    description: "Asynchronous communication between services using producer-consumer pattern",
    category: "messaging",
    difficulty: "Intermediate",
    icon: "📬",
    content: {
      overview: "A message queue is a form of asynchronous service-to-service communication. Messages are stored in a queue until they're processed by a consumer. This decouples producers from consumers, enables independent scaling, and provides built-in buffering for traffic spikes.",
      keyPoints: [
        "Producer sends message to queue → Consumer reads and processes it asynchronously",
        "Decoupling: producer doesn't need to know about the consumer or wait for processing",
        "Buffering: the queue absorbs traffic spikes that would overwhelm downstream services",
        "Guaranteed delivery: messages persist in the queue until acknowledged by the consumer",
        "Popular options: RabbitMQ, AWS SQS, Redis (with lists or streams)",
      ],
      explanation: "Consider an e-commerce order flow. When a user places an order, you need to: process payment, update inventory, send confirmation email, notify the warehouse. Without a queue, the API handler does all of this synchronously — the user waits 5+ seconds.\n\nWith a queue, the API handler saves the order and publishes an 'order.created' message. The user gets an immediate response. Separate consumer services pick up the message and handle payment, inventory, email, and notifications in parallel.\n\nIf the email service is down, the message stays in the queue. When the service recovers, it processes the backlog. No messages are lost.",
      codeExample: {
        title: "Message Queue with BullMQ (Redis)",
        code: `import { Queue, Worker } from 'bullmq';

// Producer: enqueue a job
const emailQueue = new Queue('emails');

await emailQueue.add('welcome', {
  to: 'user@example.com',
  subject: 'Welcome!',
  template: 'welcome',
});

// Consumer: process jobs
const worker = new Worker('emails', async (job) => {
  console.log(\`Sending \${job.name} to \${job.data.to}\`);
  await sendEmail(job.data);
}, {
  concurrency: 5,  // Process 5 emails in parallel
});

worker.on('completed', (job) => {
  console.log(\`Job \${job.id} completed\`);
});

worker.on('failed', (job, err) => {
  console.log(\`Job \${job.id} failed: \${err.message}\`);
  // BullMQ retries automatically
});`,
      },
      pros: ["Decouples services for independent scaling", "Buffers traffic spikes", "Guaranteed delivery with persistence"],
      cons: ["Adds complexity and latency (async processing)", "Message ordering can be tricky", "Requires monitoring for queue depth and consumer lag"],
      realWorld: ["Email/notification delivery pipelines", "Order processing in e-commerce", "Video transcoding pipelines (YouTube, TikTok)"],
    },
  },
  {
    slug: "kafka",
    title: "Apache Kafka",
    description: "Distributed event streaming platform for high-throughput real-time data pipelines",
    category: "messaging",
    difficulty: "Advanced",
    icon: "📡",
    content: {
      overview: "Apache Kafka is a distributed event streaming platform designed for high-throughput, low-latency, and durable message processing. Unlike traditional message queues where messages are deleted after consumption, Kafka retains messages for a configurable period, allowing multiple consumers to read the same data independently.",
      keyPoints: [
        "Topics are split into partitions — each partition is an ordered, append-only log",
        "Consumer groups enable parallel processing: each partition is consumed by one consumer in the group",
        "Messages are retained for days/weeks, not deleted after reading — enables replay and reprocessing",
        "Producers choose partition by key: same key always goes to same partition (ordering guarantee)",
        "Throughput: a single Kafka cluster can handle millions of messages per second",
      ],
      explanation: "Kafka's architecture is fundamentally different from traditional queues. A topic is divided into partitions, each stored on different brokers. Producers append messages to partitions, and consumers read from them at their own pace.\n\nConsumer groups enable parallelism: if a topic has 6 partitions and a consumer group has 3 consumers, each consumer reads from 2 partitions. Adding a 4th consumer would rebalance to give each consumer ~1.5 partitions.\n\nKafka's killer feature is the persistent log. Messages aren't deleted after consumption — they stay for a configured retention period (default 7 days). This enables: replaying events for debugging, adding new consumers that process historical data, and event sourcing architectures.",
      codeExample: {
        title: "Kafka Producer & Consumer (KafkaJS)",
        code: `const { Kafka } = require('kafkajs');

const kafka = new Kafka({ brokers: ['localhost:9092'] });

// Producer
const producer = kafka.producer();
await producer.connect();
await producer.send({
  topic: 'user-events',
  messages: [
    {
      key: 'user-123',       // Same key → same partition
      value: JSON.stringify({
        type: 'page_view',
        url: '/products/42',
        timestamp: Date.now(),
      }),
    },
  ],
});

// Consumer
const consumer = kafka.consumer({
  groupId: 'analytics-group',
});
await consumer.connect();
await consumer.subscribe({ topic: 'user-events' });
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value);
    console.log(\`[\${partition}] \${event.type}\`);
    await processEvent(event);
  },
});`,
      },
      pros: ["Millions of messages per second throughput", "Message replay and reprocessing", "Decoupled producers and consumers"],
      cons: ["Complex to operate (ZooKeeper/KRaft, partition management)", "Not ideal for low-latency request-response patterns", "Consumer rebalancing can cause processing delays"],
      realWorld: ["LinkedIn processes 7 trillion messages/day with Kafka", "Uber uses Kafka for real-time trip tracking", "Netflix uses Kafka for event processing pipelines"],
    },
  },
  {
    slug: "pub-sub",
    title: "Pub/Sub Pattern",
    description: "Publishers broadcast messages to all subscribers without knowing who they are",
    category: "messaging",
    difficulty: "Intermediate",
    icon: "📢",
    content: {
      overview: "The Publish/Subscribe pattern decouples message senders (publishers) from receivers (subscribers). Publishers send messages to a topic/channel without knowing who will receive them. All subscribers to that topic get a copy of the message. This enables broadcasting, event notification, and loose coupling between services.",
      keyPoints: [
        "Publishers and subscribers are fully decoupled — neither knows about the other",
        "Topic-based: messages are published to named topics, subscribers choose which topics to listen to",
        "Fan-out: one message is delivered to ALL subscribers (unlike queues where one consumer gets it)",
        "At-most-once delivery (Redis Pub/Sub) vs at-least-once (Kafka, Google Pub/Sub)",
        "Common implementations: Redis Pub/Sub, Google Cloud Pub/Sub, AWS SNS, Kafka topics",
      ],
      explanation: "In a message queue, each message is consumed by exactly one consumer. In pub/sub, each message is delivered to ALL subscribers. This is the key difference.\n\nConsider a user signup event. Multiple services care: the email service sends a welcome email, the analytics service tracks the signup, the recommendation service initializes preferences. With pub/sub, the auth service publishes a 'user.signup' event, and all three services receive it independently.\n\nRedis Pub/Sub is simple but ephemeral — if a subscriber is offline, it misses messages. Google Cloud Pub/Sub and Kafka provide durable pub/sub with message retention, so subscribers can catch up after downtime.",
      pros: ["Loose coupling — add subscribers without changing publishers", "Fan-out to multiple consumers effortlessly", "Natural fit for event-driven architectures"],
      cons: ["Message ordering is not guaranteed across subscribers", "Debugging is harder — messages flow to unknown subscribers", "No guarantee all subscribers processed successfully"],
      realWorld: ["Real-time notifications (new message, friend request)", "Microservice event propagation", "Live dashboards and monitoring alerts"],
    },
  },
  {
    slug: "event-driven",
    title: "Event-Driven Architecture",
    description: "Systems that communicate through events rather than direct synchronous calls",
    category: "messaging",
    difficulty: "Advanced",
    icon: "⚡",
    content: {
      overview: "Event-Driven Architecture (EDA) is a design pattern where system components communicate by producing and consuming events. Instead of services calling each other directly, they publish events that other services react to asynchronously, enabling loose coupling and high scalability.",
      keyPoints: [
        "Events represent facts: 'OrderPlaced', 'PaymentProcessed', 'UserRegistered'",
        "Event sourcing: store events as the source of truth, derive current state by replaying them",
        "CQRS (Command Query Responsibility Segregation): separate write and read models",
        "Saga pattern: coordinate distributed transactions across services using event chains",
        "Eventual consistency: the system reaches consistency over time, not immediately",
      ],
      explanation: "In a traditional architecture, the order service directly calls the payment service, then the inventory service, then the notification service. If any call fails, complex rollback logic is needed.\n\nIn EDA, the order service publishes an 'OrderPlaced' event. The payment service reacts by processing payment and publishing 'PaymentProcessed'. The inventory service reacts to that by reserving stock. Each service is independent and handles its own failures.\n\nEvent sourcing takes this further: instead of storing the current state of an order (status: 'shipped'), you store the sequence of events (OrderPlaced → PaymentReceived → ItemPicked → Shipped). You can reconstruct the current state by replaying events, and you have a complete audit trail.",
      pros: ["Extreme loose coupling between services", "Natural audit trail with event sourcing", "Each service scales independently"],
      cons: ["Eventual consistency requires careful design", "Debugging event chains is complex", "Event schema evolution needs careful management"],
      realWorld: ["Banking transaction processing", "E-commerce order fulfillment pipelines", "IoT sensor data processing"],
    },
  },
  // ── Distributed Systems ───────────────────────────────────
  {
    slug: "consistent-hashing",
    title: "Consistent Hashing",
    description: "Distributing data across nodes so adding/removing nodes minimizes data movement",
    category: "distributed",
    difficulty: "Advanced",
    icon: "🎡",
    content: {
      overview: "Consistent hashing distributes data across a cluster of nodes using a hash ring. When a node is added or removed, only a fraction of keys (approximately 1/n) need to be remapped, compared to traditional hashing where nearly all keys must move.",
      keyPoints: [
        "Nodes and keys are placed on a circular hash space (ring) using the same hash function",
        "Each key is assigned to the first node encountered clockwise on the ring",
        "Adding a node only affects keys between it and its predecessor — minimal disruption",
        "Virtual nodes: each physical node has multiple positions on the ring for better distribution",
        "Without virtual nodes, data can be unevenly distributed; 100-200 virtual nodes per server is common",
      ],
      explanation: "With traditional hash-based distribution (key % N servers), adding or removing a server remaps almost every key. If you go from 3 to 4 servers, ~75% of keys move to different servers — cache invalidation disaster.\n\nConsistent hashing arranges the hash space as a ring (0 to 2^32). Both servers and keys are hashed to positions on this ring. Each key is stored on the first server found clockwise from its position.\n\nWhen a server is added, it takes responsibility for keys between itself and the previous server. Only those keys move. When a server is removed, its keys move to the next server clockwise. In both cases, most keys stay where they are.",
      codeExample: {
        title: "Consistent Hashing Implementation",
        code: `const crypto = require('crypto');

class ConsistentHash {
  constructor(replicas = 150) {
    this.replicas = replicas; // Virtual nodes per server
    this.ring = new Map();    // hash → server
    this.sortedKeys = [];     // sorted hash positions
  }

  hash(key) {
    return parseInt(crypto.createHash('md5')
      .update(key).digest('hex').slice(0, 8), 16);
  }

  addNode(node) {
    for (let i = 0; i < this.replicas; i++) {
      const h = this.hash(\`\${node}:\${i}\`);
      this.ring.set(h, node);
      this.sortedKeys.push(h);
    }
    this.sortedKeys.sort((a, b) => a - b);
  }

  getNode(key) {
    const h = this.hash(key);
    // Find first node clockwise on the ring
    for (const pos of this.sortedKeys) {
      if (pos >= h) return this.ring.get(pos);
    }
    return this.ring.get(this.sortedKeys[0]); // Wrap
  }
}`,
      },
      pros: ["Minimal data movement when cluster changes", "Evenly distributes load with virtual nodes", "Foundation of many distributed systems"],
      cons: ["More complex than simple modulo hashing", "Virtual nodes add memory overhead", "Hotspot possible if hash function isn't uniform"],
      realWorld: ["Amazon DynamoDB uses consistent hashing", "Cassandra distributes data across nodes with it", "Memcached clients use consistent hashing for cache distribution"],
    },
  },
  {
    slug: "consensus-algorithms",
    title: "Consensus Algorithms (Raft & Paxos)",
    description: "How distributed nodes agree on a single value despite failures",
    category: "distributed",
    difficulty: "Advanced",
    icon: "🤝",
    content: {
      overview: "Consensus algorithms enable a group of distributed nodes to agree on a single value or sequence of values, even when some nodes fail. Raft and Paxos are the two most important consensus algorithms. They're the foundation of distributed databases, configuration stores, and leader election systems.",
      keyPoints: [
        "Problem: how do N servers agree on a value when some might crash or have network issues?",
        "Requires a quorum (majority): with 5 nodes, 3 must agree. Tolerates 2 failures",
        "Raft: leader-based. One node is the leader, handles all writes, replicates to followers",
        "Paxos: proposer-based. More flexible but harder to understand and implement",
        "Used by: etcd (Raft), ZooKeeper (ZAB, Paxos-like), CockroachDB (Raft)",
      ],
      explanation: "In Raft, nodes are in one of three states: Leader, Follower, or Candidate. The leader receives all client writes and replicates them to followers. If the leader dies, followers detect the timeout and hold an election. The candidate with the most up-to-date log wins.\n\nA write is committed only when a majority (quorum) of nodes have acknowledged it. With 5 nodes, a write needs 3 acknowledgments. This means the system can tolerate 2 node failures and still make progress.\n\nRaft is designed to be understandable — the original paper is titled 'In Search of an Understandable Consensus Algorithm.' Paxos, while theoretically equivalent, is notoriously difficult to implement correctly.",
      pros: ["Tolerates minority node failures (N/2 - 1 failures for N nodes)", "Strong consistency guarantee", "Well-proven in production systems"],
      cons: ["Requires odd number of nodes (3, 5, 7) for clean majority", "Higher write latency due to quorum requirement", "Leader becomes bottleneck for all writes"],
      realWorld: ["etcd (Kubernetes state store) uses Raft", "CockroachDB uses Raft for distributed SQL", "Google Spanner uses Paxos for global consistency"],
    },
  },
  {
    slug: "leader-election",
    title: "Leader Election",
    description: "Algorithms for distributed nodes to elect a coordinator among themselves",
    category: "distributed",
    difficulty: "Advanced",
    icon: "👑",
    content: {
      overview: "Leader election is the process by which distributed nodes choose one node as the coordinator (leader) to make decisions, handle writes, or coordinate activities. When the leader fails, a new election selects a replacement, ensuring the system continues operating.",
      keyPoints: [
        "Only one leader at any time — avoids conflicts and split-brain scenarios",
        "Heartbeats: the leader periodically signals it's alive; followers start election on timeout",
        "Split-brain: network partition can cause two nodes to think they're the leader — fencing prevents this",
        "Lease-based: leader holds a time-limited lease, must renew it periodically",
        "Implementations: ZooKeeper, etcd, Redis (Redlock), database-based (advisory locks)",
      ],
      explanation: "In many distributed systems, certain tasks need a single coordinator: writing to the primary database, assigning work to workers, or managing cluster membership. Leader election ensures exactly one node fills this role.\n\nThe leader sends periodic heartbeats. If followers don't hear from the leader within a timeout (e.g., 10 seconds), they assume it's dead and start an election. The election process varies: Raft uses randomized timeouts, ZooKeeper uses sequential znodes.\n\nThe biggest danger is split-brain: a network partition isolates the leader from some followers. The followers elect a new leader, but the old leader is still running. Now you have two leaders accepting writes. Fencing tokens solve this — each leader gets an incrementing token, and the database rejects writes from older tokens.",
      realWorld: ["Kafka broker leader election for partitions", "Kubernetes control plane leader election", "Elasticsearch master node election"],
    },
  },
  {
    slug: "gossip-protocol",
    title: "Gossip Protocol",
    description: "Peer-to-peer protocol where nodes share state by randomly talking to each other",
    category: "distributed",
    difficulty: "Advanced",
    icon: "🗣️",
    content: {
      overview: "Gossip protocols are decentralized communication protocols where each node periodically shares its state with a random subset of other nodes. Like a rumor spreading through a social network, information eventually reaches every node without a central coordinator.",
      keyPoints: [
        "Each node periodically picks a random peer and exchanges state information",
        "Information spreads exponentially: 1 → 2 → 4 → 8 nodes learn in each round",
        "Convergence: all nodes reach the same state in O(log N) rounds",
        "Failure detection: if no gossip received from a node, it's suspected as failed",
        "No single point of failure — fully decentralized, no leader required",
      ],
      explanation: "Every second, each node picks a random peer and sends its current state: 'Here's what I know about every node in the cluster.' The peer merges this information with its own and responds with its state. After a few rounds, every node has a consistent view of the cluster.\n\nThis is remarkably robust. Even if many messages are lost or nodes crash, information still propagates. The protocol is self-healing — a node that was offline catches up by receiving gossip from any peer.\n\nGossip is used for membership management (who's in the cluster?), failure detection (who's alive?), and eventually consistent state propagation (what's each node's load?).",
      pros: ["Fully decentralized — no single point of failure", "Scales to thousands of nodes", "Robust against message loss and node failures"],
      cons: ["Eventually consistent — convergence takes time", "Network overhead from periodic gossip messages", "Not suitable for strong consistency requirements"],
      realWorld: ["Cassandra uses gossip for cluster membership", "Consul uses gossip for service discovery", "Amazon DynamoDB's failure detection"],
    },
  },
  {
    slug: "rate-limiting",
    title: "Rate Limiting",
    description: "Controlling the number of requests a client can make in a time window",
    category: "distributed",
    difficulty: "Intermediate",
    icon: "🚦",
    content: {
      overview: "Rate limiting controls the number of requests a client can make to an API within a time window. It protects services from abuse, prevents resource exhaustion, and ensures fair usage across clients. Common algorithms include Fixed Window, Sliding Window, Token Bucket, and Leaky Bucket.",
      keyPoints: [
        "Fixed Window: count requests in fixed time windows (e.g., 100 requests per minute)",
        "Sliding Window: smoother than fixed window, avoids burst at window boundaries",
        "Token Bucket: tokens accumulate at a fixed rate; each request consumes a token. Allows bursts up to bucket capacity",
        "Leaky Bucket: requests enter a queue processed at a fixed rate. Smooths out traffic",
        "Rate limits communicated via headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After",
      ],
      explanation: "Token Bucket is the most popular algorithm. Imagine a bucket that holds 100 tokens. Tokens are added at a rate of 10 per second. Each request takes one token. If the bucket is empty, the request is rejected (429 Too Many Requests).\n\nThis naturally allows bursts: a client can send 100 requests immediately (draining the bucket) but then must wait for tokens to refill. This is ideal for APIs where occasional bursts are acceptable.\n\nIn distributed systems, rate limiting state (counters) must be shared across all servers. Redis is the common solution — its atomic INCR with EXPIRE provides a simple distributed counter.",
      codeExample: {
        title: "Token Bucket Rate Limiter",
        code: `class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate; // tokens per second
    this.lastRefill = Date.now();
  }

  tryConsume() {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;  // Request allowed
    }
    return false;   // Rate limited (429)
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsed * this.refillRate
    );
    this.lastRefill = now;
  }
}

// Usage: 100 requests/minute capacity,
// refills at ~1.67 tokens/sec
const limiter = new TokenBucket(100, 100 / 60);`,
      },
      pros: ["Protects services from abuse and overload", "Token bucket naturally handles burst traffic", "Fair usage across clients"],
      cons: ["Distributed rate limiting adds Redis dependency", "Fixed windows can allow 2x limit at boundary edges", "Hard to choose the right limits without load testing"],
      realWorld: ["GitHub API: 5000 requests/hour", "Twitter API: 300 tweets/3 hours", "Stripe API: 100 requests/second"],
    },
  },
  // ── Design Patterns ───────────────────────────────────────
  {
    slug: "circuit-breaker",
    title: "Circuit Breaker Pattern",
    description: "Prevent cascading failures by failing fast when a downstream service is unhealthy",
    category: "patterns",
    difficulty: "Intermediate",
    icon: "🔌",
    content: {
      overview: "The Circuit Breaker pattern prevents an application from repeatedly calling a failing service. Like an electrical circuit breaker, it 'trips' when failures exceed a threshold, immediately rejecting requests without trying the call. After a cooldown, it allows a test request to see if the service has recovered.",
      keyPoints: [
        "Three states: Closed (normal), Open (failing fast), Half-Open (testing recovery)",
        "Closed: requests pass through normally; failures are counted",
        "Open: all requests immediately fail without calling the downstream service",
        "Half-Open: after timeout, one request is allowed through to test if the service recovered",
        "Prevents cascading failures where one failed service brings down the entire system",
      ],
      explanation: "Imagine Service A calls Service B, which is down. Without a circuit breaker, Service A keeps retrying, holding connections open, consuming threads, and eventually Service A itself becomes unresponsive. Now Service C, which depends on Service A, also fails. This is a cascading failure.\n\nWith a circuit breaker, after 5 consecutive failures to Service B, the breaker trips to Open state. For the next 30 seconds, all calls to Service B immediately return an error without making a network call. This protects Service A's resources.\n\nAfter 30 seconds, the breaker moves to Half-Open and allows one test request. If it succeeds, the breaker closes and normal operation resumes. If it fails, it stays open for another cooldown period.",
      codeExample: {
        title: "Circuit Breaker Implementation",
        code: `class CircuitBreaker {
  constructor(fn, { threshold = 5, timeout = 30000 }) {
    this.fn = fn;
    this.threshold = threshold;
    this.timeout = timeout;
    this.failures = 0;
    this.state = 'CLOSED';
    this.nextAttempt = 0;
  }

  async call(...args) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await this.fn(...args);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}`,
      },
      pros: ["Prevents cascading failures across services", "Fails fast — frees up resources immediately", "Self-healing with half-open testing"],
      cons: ["Adds complexity to service calls", "Must tune threshold and timeout per dependency", "Can mask real issues if breaker trips too easily"],
      realWorld: ["Netflix Hystrix (now Resilience4j)", "AWS App Mesh circuit breaking", "Microsoft Azure Service Fabric"],
    },
  },
  {
    slug: "saga-pattern",
    title: "Saga Pattern",
    description: "Managing distributed transactions across microservices using a sequence of local transactions",
    category: "patterns",
    difficulty: "Advanced",
    icon: "📜",
    content: {
      overview: "The Saga pattern manages distributed transactions by breaking them into a sequence of local transactions, each with a compensating action. If one step fails, the saga executes compensating transactions to undo the completed steps, achieving eventual consistency without distributed locks.",
      keyPoints: [
        "Each service performs a local transaction and publishes an event/command for the next step",
        "If a step fails, compensating transactions undo the previous steps in reverse order",
        "Choreography: services react to events autonomously — no central coordinator",
        "Orchestration: a central saga orchestrator tells each service what to do and handles failures",
        "Provides eventual consistency without the performance cost of distributed ACID (2PC)",
      ],
      explanation: "Consider an e-commerce order: (1) Reserve inventory, (2) Process payment, (3) Arrange shipping. With traditional distributed transactions (2PC), all three must commit atomically — slow and fragile.\n\nWith a saga: Step 1 reserves inventory. Step 2 charges payment. If Step 3 (shipping) fails, compensating transactions fire: refund payment (undo Step 2), release inventory (undo Step 1).\n\nOrchestrated sagas use a central coordinator that sends commands ('Reserve inventory') and listens for responses ('Inventory reserved'). Choreographed sagas have each service publish events that trigger the next step.",
      pros: ["No distributed locks or 2PC overhead", "Each service maintains its own ACID transactions", "Scales well in microservices architectures"],
      cons: ["Complex to implement correctly, especially compensating logic", "Eventual consistency — intermediate states are visible", "Debugging saga failures across services is challenging"],
      realWorld: ["Order processing in e-commerce (Amazon, Shopify)", "Travel booking (flight + hotel + car rental)", "Banking fund transfers across institutions"],
    },
  },
  {
    slug: "cqrs",
    title: "CQRS (Command Query Responsibility Segregation)",
    description: "Separate models for reading and writing data, optimized independently",
    category: "patterns",
    difficulty: "Advanced",
    icon: "↔️",
    content: {
      overview: "CQRS separates the read and write sides of an application into distinct models. Commands (writes) go to a model optimized for validation and consistency. Queries (reads) go to a model optimized for fast retrieval. This allows each side to scale, evolve, and be optimized independently.",
      keyPoints: [
        "Write model: normalized, validates business rules, handles commands (CreateOrder, UpdateUser)",
        "Read model: denormalized, optimized for specific query patterns (pre-joined, pre-aggregated)",
        "Read and write models can use different databases: SQL for writes, Elasticsearch for reads",
        "Often paired with Event Sourcing: events update the read model asynchronously",
        "The read model can be rebuilt from scratch by replaying events",
      ],
      explanation: "In a traditional CRUD application, the same database model handles both reads and writes. This forces trade-offs: normalize for write performance or denormalize for read performance?\n\nCQRS eliminates this trade-off. Writes go to a normalized relational database with strict constraints. Reads come from a denormalized read store (Redis, Elasticsearch, or a materialized view) optimized for the exact queries the UI needs.\n\nWhen a write occurs, an event is published (e.g., 'OrderCreated'). An event handler updates the read model asynchronously. The read model might pre-compute dashboards, pre-join related data, or maintain search indexes.",
      pros: ["Read and write sides scale independently", "Each side uses the optimal database/model", "Simplifies complex domains by separating concerns"],
      cons: ["Eventually consistent between read and write models", "More infrastructure to manage (two databases, event handlers)", "Overkill for simple CRUD applications"],
      realWorld: ["E-commerce product search (write to SQL, read from Elasticsearch)", "Financial reporting (write transactions, read pre-computed reports)", "Social media feeds (write posts, read pre-built timelines)"],
    },
  },
  {
    slug: "strangler-fig",
    title: "Strangler Fig Pattern",
    description: "Incrementally migrating a legacy system by gradually replacing components",
    category: "patterns",
    difficulty: "Intermediate",
    icon: "🌿",
    content: {
      overview: "The Strangler Fig pattern is a migration strategy where you gradually replace components of a legacy system with new implementations. Named after the strangler fig tree that grows around a host tree, the new system slowly wraps the old one until it can be removed entirely.",
      keyPoints: [
        "Never attempt a 'big bang' rewrite — it's the highest-risk approach",
        "Route traffic through a facade that delegates to old or new system per feature",
        "Migrate one feature at a time: user auth → user profiles → search → etc.",
        "Both old and new systems run in parallel during migration",
        "Rollback is easy: just route traffic back to the old system for that feature",
      ],
      explanation: "Rewriting a large system from scratch is tempting but dangerous. The new system must replicate all functionality of the old one, including edge cases discovered over years. Meanwhile, the old system keeps evolving.\n\nThe Strangler Fig approach places a routing layer (facade) in front of both systems. Initially, 100% of traffic goes to the old system. You build the new 'user auth' module, test it thoroughly, then update the facade to route auth requests to the new system.\n\nThis continues feature by feature. At any point, you can route a feature back to the old system if issues arise. Eventually, the old system handles nothing and can be decommissioned.",
      pros: ["Low risk — migrate incrementally with easy rollback", "Old system keeps running during migration", "Each migration step is small and testable"],
      cons: ["Running two systems in parallel increases operational cost", "Need to maintain the routing facade", "Can drag on if not prioritized — becomes permanent dual-system"],
      realWorld: ["Amazon's monolith-to-microservices migration", "Shopify's gradual migration from Rails monolith", "LinkedIn migrating from monolith to services"],
    },
  },
  {
    slug: "bulkhead",
    title: "Bulkhead Pattern",
    description: "Isolating components so a failure in one doesn't cascade to others",
    category: "patterns",
    difficulty: "Intermediate",
    icon: "🚢",
    content: {
      overview: "The Bulkhead pattern isolates different parts of a system so that a failure in one component doesn't bring down the entire system. Named after the watertight compartments in ships, it ensures that flooding in one section doesn't sink the whole vessel.",
      keyPoints: [
        "Separate thread pools, connection pools, or service instances per dependency",
        "If one dependency exhausts its pool, other dependencies are unaffected",
        "Types: thread pool isolation, process isolation, connection pool isolation",
        "Often combined with Circuit Breaker for comprehensive resilience",
        "Can be applied at service level (separate deployments) or code level (separate thread pools)",
      ],
      explanation: "Without bulkheads, a single slow dependency can exhaust all available threads. If your app has 100 threads and the payment service is slow, all 100 threads get stuck waiting for payment responses. Now no threads are available for user service calls, product service calls, or anything else.\n\nWith bulkheads, you allocate separate resource pools: 30 threads for payment, 30 for users, 40 for products. If payment is slow and uses all 30 threads, the other 70 threads continue serving user and product requests normally.\n\nAt a larger scale, bulkheads mean deploying separate instances for different customer tiers: free users on one pool, enterprise on another. An outage affecting free-tier doesn't impact paying customers.",
      pros: ["Prevents cascading failures from slow dependencies", "Isolates blast radius of failures", "Can prioritize critical paths with larger pools"],
      cons: ["Reduced overall resource utilization (pools can't share idle capacity)", "More complex configuration and tuning", "Must size pools carefully for each dependency"],
      realWorld: ["Netflix Hystrix thread pool isolation", "AWS account separation for blast radius", "Kubernetes resource quotas per namespace"],
    },
  },
  // ── Real-World Systems ────────────────────────────────────
  {
    slug: "design-url-shortener",
    title: "Design a URL Shortener",
    description: "Design a service like TinyURL that creates short aliases for long URLs",
    category: "real-world",
    difficulty: "Intermediate",
    icon: "🔗",
    content: {
      overview: "A URL shortener converts long URLs into short, unique aliases (e.g., tinyurl.com/abc123). The core challenges are generating unique short codes, handling high read volume, and providing fast redirects. This is one of the most common system design interview questions.",
      keyPoints: [
        "Core API: POST /shorten {url} → short_code, GET /{short_code} → 301 redirect to original URL",
        "Short code generation: Base62 encoding of auto-increment ID, or hash-based (MD5/SHA → first 7 chars)",
        "Read-heavy: 100:1 read/write ratio — optimize for fast redirects",
        "Caching: store popular URLs in Redis for sub-ms redirect",
        "Database: simple schema — (short_code, original_url, created_at, expires_at)",
      ],
      explanation: "Scale estimation: 100M new URLs/day = ~1200 writes/sec. 10B redirects/day = ~115K reads/sec. Storage: 100M × 500 bytes = 50GB/day, ~18TB/year.\n\nShort code generation using Base62 (a-z, A-Z, 0-9): 7 characters = 62^7 = 3.5 trillion possible codes — enough for decades. Approach 1: use a distributed ID generator (Snowflake), convert to Base62. Approach 2: hash the URL, take first 7 chars, handle collisions.\n\nArchitecture: Load Balancer → Application Servers → Cache (Redis) → Database (SQL or NoSQL). For redirects: check Redis first (cache hit for popular URLs), fall back to database. Use 301 (permanent redirect) for SEO, 302 (temporary redirect) for analytics tracking.\n\nFor analytics, log each redirect event to Kafka and process asynchronously.",
      codeExample: {
        title: "URL Shortener Core Logic",
        code: `const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function encode(num) {
  let str = '';
  while (num > 0) {
    str = BASE62[num % 62] + str;
    num = Math.floor(num / 62);
  }
  return str.padStart(7, '0');
}

// POST /api/shorten
app.post('/api/shorten', async (req, res) => {
  const { url } = req.body;
  const id = await db.insert({ url });  // Auto-increment
  const code = encode(id);
  await redis.set(code, url, 'EX', 86400 * 30);
  res.json({ shortUrl: \`https://short.ly/\${code}\` });
});

// GET /:code → redirect
app.get('/:code', async (req, res) => {
  let url = await redis.get(req.params.code);
  if (!url) {
    const row = await db.findByCode(req.params.code);
    if (!row) return res.status(404).send('Not found');
    url = row.url;
    await redis.set(req.params.code, url, 'EX', 3600);
  }
  res.redirect(301, url);
});`,
      },
      realWorld: ["TinyURL, Bit.ly, t.co (Twitter)", "Shortened links in SMS and email marketing", "Internal link management at large companies"],
    },
  },
  {
    slug: "design-chat-system",
    title: "Design a Chat System",
    description: "Design a real-time messaging system like WhatsApp or Slack",
    category: "real-world",
    difficulty: "Advanced",
    icon: "💬",
    content: {
      overview: "A chat system supports real-time message delivery between users (1-on-1 and group). Core challenges include maintaining persistent WebSocket connections at scale, message ordering, offline message delivery, and read receipts. At WhatsApp's scale, this means 100B+ messages per day.",
      keyPoints: [
        "WebSocket connections for real-time message delivery — each user maintains a persistent connection",
        "Connection gateway: a stateful service that maps user IDs to WebSocket connections",
        "Message flow: Sender → Gateway → Message Service → Store in DB → Forward to recipient's Gateway",
        "Offline users: messages are stored and delivered when they reconnect (push notification triggers)",
        "Message ordering: timestamps + server-assigned sequence numbers within each conversation",
      ],
      explanation: "Architecture: Users connect via WebSocket to a Chat Gateway (stateful, knows which user is on which server). When Alice sends a message to Bob:\n\n1. Alice's gateway receives the message over WebSocket\n2. Message is sent to the Message Service via internal RPC\n3. Message Service stores it in the database (Cassandra — partitioned by conversation ID)\n4. Message Service checks if Bob is online by querying the presence service\n5. If online, forward to Bob's gateway, which delivers via WebSocket\n6. If offline, enqueue a push notification\n\nFor group chats, the message is fanned out to all group members. For a 500-person group, that's 500 deliveries per message — message queues handle this async.\n\nRead receipts and typing indicators use lightweight signals over the same WebSocket connection.",
      realWorld: ["WhatsApp: 100B messages/day, 2B users", "Slack: persistent group channels with threading", "Discord: voice + text + presence for millions of concurrent users"],
    },
  },
  {
    slug: "design-news-feed",
    title: "Design a News Feed",
    description: "Design a social media feed system like Twitter's timeline or Facebook's News Feed",
    category: "real-world",
    difficulty: "Advanced",
    icon: "📰",
    content: {
      overview: "A News Feed system aggregates and ranks content from users you follow, delivering a personalized timeline. The core challenge is generating feeds for millions of users in real-time, balancing freshness, relevance, and system performance.",
      keyPoints: [
        "Fan-out on write: pre-compute feeds when a user posts — push to all followers' timelines",
        "Fan-out on read: compute the feed at read time by pulling posts from followed users — pull model",
        "Hybrid approach: fan-out on write for normal users, fan-out on read for celebrities (millions of followers)",
        "Feed ranking: chronological, or ML-based scoring (engagement, relevance, recency)",
        "Feed storage: pre-computed timeline in Redis (list of post IDs per user)",
      ],
      explanation: "When User A posts, the system must deliver that post to all of A's followers' feeds. Two approaches:\n\nFan-out on write: when A posts, immediately push the post ID into every follower's feed cache (Redis list). When a follower opens their feed, it's already built — just read from Redis. Fast reads, but expensive for users with millions of followers (celebrity problem).\n\nFan-out on read: the feed is computed when a user requests it. Pull recent posts from all followed users, merge, rank, and return. No precomputation, but slow for users following thousands of accounts.\n\nThe hybrid approach (used by Twitter): regular users use fan-out on write. Celebrities (>10K followers) use fan-out on read — their posts are mixed in at read time. This avoids writing to millions of caches when a celebrity tweets.",
      codeExample: {
        title: "Feed Generation (Hybrid Approach)",
        code: `// Fan-out on write for normal users
async function onNewPost(post) {
  const followers = await getFollowers(post.authorId);

  if (followers.length < 10000) {
    // Small following: push to all feeds
    for (const followerId of followers) {
      await redis.lpush(
        \`feed:\${followerId}\`, post.id
      );
      await redis.ltrim(
        \`feed:\${followerId}\`, 0, 999
      ); // Keep 1000
    }
  }
  // Celebrities: skip fan-out, merge at read time
}

// Read feed (merge pre-built + celebrity posts)
async function getFeed(userId) {
  // Pre-built feed from fan-out
  const feedIds = await redis.lrange(
    \`feed:\${userId}\`, 0, 49
  );
  // Celebrity posts (fan-out on read)
  const celebs = await getCelebritiesFollowed(userId);
  const celebPosts = await getRecentPosts(celebs);

  // Merge, rank by timestamp, return top 50
  const all = [...feedIds, ...celebPosts.map(p => p.id)];
  return rankAndLimit(all, 50);
}`,
      },
      realWorld: ["Twitter timeline (fan-out on write + hybrid for celebrities)", "Facebook News Feed (ML-ranked)", "Instagram feed (engagement-based ranking)"],
    },
  },
  {
    slug: "design-notification-system",
    title: "Design a Notification System",
    description: "Design a system to send push notifications, emails, and SMS at scale",
    category: "real-world",
    difficulty: "Intermediate",
    icon: "🔔",
    content: {
      overview: "A notification system delivers messages across multiple channels (push, email, SMS, in-app) based on user preferences and event triggers. It handles template rendering, delivery scheduling, rate limiting, and retry logic at scale.",
      keyPoints: [
        "Multi-channel: push notifications (APNs/FCM), email (SES/SendGrid), SMS (Twilio), in-app",
        "Event-driven: services publish events (OrderShipped), notification service reacts based on user preferences",
        "Template system: render notification content from templates + event data",
        "User preferences: users choose which notifications they want and on which channels",
        "Deduplication: prevent sending the same notification twice using idempotency keys",
      ],
      explanation: "Architecture: Event producers → Message Queue (Kafka) → Notification Service → Channel-specific workers (push worker, email worker, SMS worker) → Third-party providers (APNs, SendGrid, Twilio).\n\nWhen an order ships, the order service publishes an 'OrderShipped' event. The notification service: (1) looks up user preferences — does this user want shipping notifications? On which channels? (2) Renders the message from a template. (3) Enqueues delivery jobs for each channel.\n\nChannel workers handle delivery, retries, and provider-specific logic. Push notifications need device tokens (stored per user). Email needs unsubscribe links (CAN-SPAM compliance). SMS needs phone number verification.\n\nRate limiting prevents notification fatigue: max 3 push notifications per hour per user. Priority levels ensure critical notifications (security alerts) bypass rate limits.",
      realWorld: ["Amazon order updates across email, push, and SMS", "Slack notification preferences per channel", "GitHub notification routing (email, web, mobile)"],
    },
  },
  {
    slug: "design-autocomplete",
    title: "Design Search Autocomplete",
    description: "Design a typeahead system that suggests completions as users type",
    category: "real-world",
    difficulty: "Intermediate",
    icon: "🔍",
    content: {
      overview: "Search autocomplete (typeahead) suggests query completions as users type, showing the most relevant results within 100ms. The core data structure is a Trie (prefix tree) that efficiently stores and retrieves strings by prefix. The system must handle millions of queries per second with minimal latency.",
      keyPoints: [
        "Trie data structure: stores words character by character, enabling fast prefix lookup",
        "Top-K results: each trie node stores the top 10-20 most popular completions for that prefix",
        "Data collection: log search queries, aggregate popularity (MapReduce), update trie periodically",
        "Latency target: <100ms end-to-end, suggestions update after 2-3 keystrokes",
        "Multi-layer caching: browser cache, CDN cache, application cache (Redis)",
      ],
      explanation: "The Trie approach: build a trie of all searchable terms. For the prefix 'sys', traverse to the 's' → 'y' → 's' node and return pre-computed top suggestions: ['system design', 'system of a down', 'systems thinking'].\n\nTo keep suggestions relevant, log all search queries and periodically (every few hours) aggregate popularity using MapReduce. Rebuild the trie with updated popularity scores and deploy it to application servers.\n\nOptimizations: (1) Don't query until 2+ characters typed (reduces load 50x). (2) Debounce keystrokes by 100-200ms. (3) Cache results at the CDN — 'sys' returns the same results for every user. (4) Return results from browser cache if the user deletes and retypes.",
      codeExample: {
        title: "Trie for Autocomplete",
        code: `class TrieNode {
  constructor() {
    this.children = {};
    this.topSuggestions = []; // Pre-computed top-K
  }
}

class AutocompleteTrie {
  constructor() { this.root = new TrieNode(); }

  insert(word, popularity) {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
      // Update top suggestions at each prefix node
      this.updateTop(node, word, popularity);
    }
  }

  updateTop(node, word, popularity) {
    const existing = node.topSuggestions
      .findIndex(s => s.word === word);
    if (existing >= 0) {
      node.topSuggestions[existing].score = popularity;
    } else {
      node.topSuggestions.push(
        { word, score: popularity }
      );
    }
    node.topSuggestions.sort((a, b) => b.score - a.score);
    node.topSuggestions = node.topSuggestions.slice(0, 10);
  }

  search(prefix) {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children[char]) return [];
      node = node.children[char];
    }
    return node.topSuggestions;
  }
}`,
      },
      realWorld: ["Google Search autocomplete (billions of queries/day)", "YouTube search suggestions", "E-commerce product search (Amazon, Shopify)"],
    },
  },
  {
    slug: "design-video-streaming",
    title: "Design a Video Streaming Platform",
    description: "Design a system like YouTube or Netflix for uploading and streaming video at scale",
    category: "real-world",
    difficulty: "Advanced",
    icon: "🎬",
    content: {
      overview: "A video streaming platform handles video upload, transcoding into multiple resolutions and formats, storage in a distributed system, and adaptive bitrate streaming to millions of concurrent viewers. Netflix streams 17% of all internet traffic.",
      keyPoints: [
        "Upload pipeline: chunked upload → virus scan → transcoding (multiple resolutions: 240p to 4K)",
        "Transcoding: convert raw video into multiple formats (H.264, VP9, AV1) and resolutions using FFmpeg",
        "Adaptive Bitrate Streaming (ABR): client automatically switches quality based on bandwidth (HLS/DASH)",
        "CDN distribution: video segments cached at edge servers globally for low-latency playback",
        "Blob storage: video files stored in object storage (S3) — raw uploads and transcoded variants",
      ],
      explanation: "Upload flow: the client uploads the video in chunks to an upload service. Chunks are stored in blob storage (S3). A transcoding pipeline (triggered via message queue) converts the video into multiple renditions: 240p, 360p, 480p, 720p, 1080p, 4K — each in multiple codecs.\n\nEach rendition is split into small segments (2-10 seconds each) and stored on blob storage. A manifest file (HLS .m3u8 or DASH .mpd) lists all segments and their quality levels.\n\nStreaming flow: the video player downloads the manifest, then requests segments. It starts with low quality, monitors download speed, and switches to higher quality as bandwidth allows (adaptive bitrate). If bandwidth drops, it switches to lower quality without buffering.\n\nCDN is crucial: segments are cached at 200+ edge locations. A viewer in Tokyo gets segments from a Tokyo edge server, not the US origin.",
      realWorld: ["YouTube: 500 hours of video uploaded every minute", "Netflix: 200M subscribers, 17% of global internet traffic", "Twitch: live streaming with sub-second latency"],
    },
  },
  {
    slug: "design-file-storage",
    title: "Design a File Storage System",
    description: "Design a cloud file storage service like Google Drive or Dropbox",
    category: "real-world",
    difficulty: "Advanced",
    icon: "📁",
    content: {
      overview: "A cloud file storage system lets users upload, sync, and share files across devices. Core challenges include efficient file syncing (only transferring changed parts), conflict resolution when multiple devices edit the same file, and reliable storage at scale.",
      keyPoints: [
        "Block-level deduplication: split files into blocks (4MB chunks), hash each block, only store unique blocks",
        "Delta sync: when a file changes, only upload the changed blocks — not the entire file",
        "Metadata DB: stores file/folder hierarchy, permissions, versions, block references",
        "Block storage: actual file blocks in blob storage (S3), referenced by content hash",
        "Conflict resolution: last-write-wins, or create conflict copies for manual resolution",
      ],
      explanation: "File structure: a 100MB file is split into 25 blocks of 4MB each. Each block is hashed (SHA-256). Only blocks with new hashes are uploaded. If you edit page 5 of a document, only 1-2 blocks change — the upload is 4-8MB instead of 100MB.\n\nDeduplication: if two users upload the same file, the blocks are identical (same hashes). The system stores the blocks once and both users' metadata points to the same blocks. This saves massive storage.\n\nSync flow: (1) Client detects file change. (2) Splits file into blocks, computes hashes. (3) Asks server which blocks it already has. (4) Uploads only new blocks. (5) Updates metadata with new block list. (6) Server notifies other devices via long-polling or WebSocket. (7) Other devices download only the new blocks.\n\nConflict handling: if two devices edit the same file offline, the last sync wins and a conflict copy is created for the other version.",
      realWorld: ["Dropbox uses block-level dedup and delta sync", "Google Drive handles 2B+ files daily", "iCloud syncs across Apple devices"],
    },
  },
  {
    slug: "design-ride-sharing",
    title: "Design a Ride-Sharing Platform",
    description: "Design a system like Uber for matching riders with drivers in real-time",
    category: "real-world",
    difficulty: "Advanced",
    icon: "🚗",
    content: {
      overview: "A ride-sharing platform matches riders with nearby drivers in real-time, calculates routes and fares, and tracks rides from pickup to dropoff. Core challenges include real-time location tracking at scale, efficient driver matching using spatial indexes, and dynamic pricing during high demand.",
      keyPoints: [
        "Location service: drivers send GPS updates every 3-5 seconds — millions of location updates per second",
        "Spatial indexing: find nearby drivers using geohash, QuadTree, or PostGIS for efficient proximity queries",
        "Matching algorithm: find nearest available driver considering ETA, driver rating, and vehicle type",
        "ETA calculation: real-time routing considering traffic, road closures, historical patterns",
        "Surge pricing: dynamic pricing based on supply (available drivers) and demand (ride requests) per zone",
      ],
      explanation: "When a rider requests a ride: (1) The location service identifies the rider's geohash cell. (2) A proximity query finds available drivers within adjacent cells (typically 1-3km radius). (3) The matching service ranks candidates by ETA, rating, and vehicle match. (4) The top driver gets a ride offer with 15-second timeout. (5) If declined, offer goes to the next driver.\n\nDriver location tracking: each driver sends GPS coordinates every 4 seconds. With 1M active drivers, that's 250K updates/second. These are stored in a spatial index (QuadTree or geohash-based) in memory for fast proximity queries.\n\nSurge pricing divides the city into hexagonal zones. When ride requests in a zone exceed available drivers, surge multiplier increases (1.5x, 2x, 3x). This incentivizes nearby drivers to move to the high-demand zone.",
      realWorld: ["Uber: 100M+ monthly riders, 5M+ drivers", "Lyft: real-time matching in 600+ cities", "Grab: dominant in Southeast Asia with similar architecture"],
    },
  },
];

export const getCategoryColor = (categoryId: string): string => {
  const colorMap: Record<string, string> = {
    fundamentals: "blue",
    scalability: "emerald",
    "load-balancing": "purple",
    databases: "orange",
    caching: "yellow",
    networking: "cyan",
    messaging: "pink",
    distributed: "red",
    patterns: "indigo",
    "real-world": "violet",
  };
  return colorMap[categoryId] || "gray";
};

export const getDifficultyColor = (difficulty: Difficulty): string => {
  const colorMap: Record<Difficulty, string> = {
    Beginner: "emerald",
    Intermediate: "amber",
    Advanced: "red",
  };
  return colorMap[difficulty];
};
