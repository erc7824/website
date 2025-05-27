---
title: Production Deployment
description: Guide for deploying Nitrolite applications to production
keywords: [deployment, production, infrastructure, devops, scaling]
---

# Production Deployment

Guide for deploying Nitrolite applications and ClearNode infrastructure to production environments.

## Deployment Overview

### Architecture Components

<div align="center">
```mermaid
graph TB
    subgraph "Client Applications"
        A[Web App] --> B[TypeScript SDK]
        C[Mobile App] --> B
        B --> D[WebSocket Connection]
    end

    subgraph "ClearNode Infrastructure"
        D --> E[ClearNode Server]
        E --> F[PostgreSQL/SQLite]
        E --> G[Prometheus Metrics]
    end

    subgraph "Blockchain Infrastructure"
        E --> H[Ethereum RPC]
        H --> I[Custody Contracts]
        E --> J[Multi-Chain Support]
    end

    style A fill:#e3f2fd
    style E fill:#f3e5f5
    style H fill:#fff3e0
```
</div>

## Prerequisites

### ClearNode Requirements

**Minimum Production Environment:**
- **Compute:** 2 vCPU, 4GB RAM for ClearNode
- **Storage:** 50GB SSD with automated backups
- **Network:** Stable internet connection with WebSocket support
- **Database:** PostgreSQL 13+ or SQLite for development

**Recommended Production Environment:**
- **Compute:** 4 vCPU, 8GB RAM with monitoring
- **Storage:** 200GB SSD with daily backups
- **Network:** Load balancer with SSL termination
- **Monitoring:** Prometheus metrics collection

### Software Dependencies

**ClearNode Server:**
- **Go:** 1.21+ for building ClearNode
- **Database:** PostgreSQL 13+ (production) or SQLite (development)
- **RPC Access:** Infura, Alchemy, or self-hosted Ethereum nodes

## Environment Configuration

### ClearNode Environment Variables

```bash
# Core Configuration
BROKER_PRIVATE_KEY=0x1234567890123456789012345678901234567890123456789012345678901234
DATABASE_DRIVER=postgres
DATABASE_URL=postgresql://user:password@localhost:5432/clearnode
LOG_LEVEL=info
HTTP_PORT=8000
METRICS_PORT=4242

# Multi-Chain Network Configuration
POLYGON_INFURA_URL=https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY
POLYGON_CUSTODY_CONTRACT_ADDRESS=0xDB33fEC4e2994a675133320867a6439Da4A5acD8

CELO_INFURA_URL=https://celo-mainnet.infura.io/v3/YOUR_INFURA_KEY
CELO_CUSTODY_CONTRACT_ADDRESS=0xDB33fEC4e2994a675133320867a6439Da4A5acD8

BASE_INFURA_URL=https://base-mainnet.infura.io/v3/YOUR_INFURA_KEY
BASE_CUSTODY_CONTRACT_ADDRESS=0xYOUR_BASE_CONTRACT_ADDRESS

ETH_SEPOLIA_INFURA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
ETH_SEPOLIA_CUSTODY_CONTRACT_ADDRESS=0xYOUR_SEPOLIA_CONTRACT_ADDRESS

# Optional Configuration
MSG_EXPIRY_TIME=60  # Message timestamp expiry in seconds
```


## ClearNode Deployment

## 1. Database Setup

### PostgreSQL

Start PostgreSQL container:
```bash
docker run --rm -e POSTGRES_PASSWORD=postgres -e POSTGRES_HOST_AUTH_METHOD=trust -p 5432:5432 --name postgres postgres:16
```

### SQLite

```bash
# For development, ClearNode can use SQLite
DATABASE_DRIVER=sqlite
DATABASE_URL=clearnode.db
```

### Building from Source

```bash
# Clone the repository
git clone https://github.com/erc7824/nitrolite.git
cd nitrolite/clearnode

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Build the binary
go build -o clearnode ./...

# Run ClearNode
./clearnode
```

### Docker Deployment

```bash
# Build and run with Docker
docker build -t clearnode .

# Start ClearNode
docker run -p 8000:8000 -p 4242:4242 --env-file .env clearnode
```

## Monitoring and Observability

### Prometheus Metrics

ClearNode provides built-in Prometheus metrics on port 4242:

```bash
# Access metrics endpoint
curl http://localhost:4242/metrics
```

### Key Metrics

```prometheus
# Channel and ledger metrics
clearnode_channels_total
clearnode_active_connections
clearnode_ledger_balance_total
clearnode_rpc_requests_total
clearnode_errors_total

# System metrics
clearnode_memory_usage_bytes
clearnode_cpu_usage_percent
clearnode_database_connections
```

## Security and Maintenance

### ClearNode Security

**Private Key Management:**
- Store `BROKER_PRIVATE_KEY` securely using environment variables
- Use hardware security modules (HSMs) for production private keys

**Network Security:**
- Use WSS for WebSocket connections in production
- Configure firewall to allow only ports 8000 (HTTP) and 4242 (metrics)

### Database Backup and Recovery

```bash
# PostgreSQL backup
pg_dump -h localhost -U clearnode_user clearnode > clearnode_backup.sql

# Restore from backup
psql -h localhost -U clearnode_user clearnode < clearnode_backup.sql
```

### Health Checks

**ClearNode Health Checks:**
```bash
# Check if ClearNode is responding
curl -f http://localhost:8000/health || exit 1

# Check WebSocket connectivity
# npm install -g wscat
wscat -c ws://localhost:8000/ws

# Check metrics endpoint
curl http://localhost:4242/metrics
```

## Troubleshooting

### Common Issues

**ClearNode Port Conflicts:**
```bash
# Check what's using port 8000
lsof -i :8000

# Change ClearNode HTTP port
HTTP_PORT=8080
```

**ClearNode Database Issues:**
```bash
# Test PostgreSQL connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check if ClearNode migrations ran
# ClearNode runs migrations automatically on startup
```

## Next Steps

For ClearNode support, refer to the [ClearNode documentation](https://github.com/erc7824/nitrolite/tree/main/clearnode) or join [Discord](https://discord.gg/yellownetwork).
