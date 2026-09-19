# SparkX HR Management SaaS — Backend API

Multi-Tenant Company Management & HR SaaS backend built with Node.js, Express, TypeScript, and MongoDB.

## Architecture & Features Built (Phases 1 - 5)
- **Phase 1**: Architecture & Base Setup (Express, TypeScript, ImgBB Cloud Storage integration).
- **Phase 2**: Authentication & Multi-Tenancy (JWT Access/Refresh token rotation, Argon2 hashing, Organization isolation, Seed scripts).
- **Phase 3**: Organization Hierarchy & Granular RBAC (Departments, Teams, Designations, Visual Org Tree Engine, Permission Matrix).
- **Phase 4**: Employee Directory & Secure Document Vault (360° Employee Profiles, ImgBB Document Vault, Auto Employee Code generation).
- **Phase 5**: Attendance & Two-Tier Leave Management (Web clock-in/out, Late & Overtime calculation, HR Roll Call, 6 Leave types, Annual balance ledger, Two-Tier Approval Pipeline: Manager Review → HR Final Validation).

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas or local MongoDB instance

### Installation
```bash
npm install
```

### Environment Variables
Copy `.env.example` to `.env` and fill in your values:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
CORS_ORIGIN=http://localhost:3000
IMGBB_API_KEY=your_imgbb_api_key
```

### Running the Server
```bash
# Development
npm run dev

# Build
npm run build

# Start Production
npm start
```
