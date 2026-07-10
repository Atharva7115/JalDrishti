# JalDrishti: Groundwater Monitoring Platform

JalDrishti is a Groundwater Monitoring Platform designed as a monorepo consisting of a React frontend, an Express backend, and a Python-based FastAPI Machine Learning service.

## Project Structure & Architecture

```text
JalDrishti/
├── backend/          # Node.js/Express.js Server (REST APIs, Data Fetching, DB Integration)
├── frontend/         # React.js (Vite) User Interface (Visualization & Analysis Dashboards)
├── ml-service/       # Python FastAPI Service (Anomaly Detection, Gap Filling, Forecasting)
├── database/         # Database migrations, seed scripts, and SQL schemas (PostgreSQL/PostGIS)
├── docs/             # Documentation, design diagrams, and specifications
├── scripts/          # Automation, deployment, and management scripts
├── docker/           # Containerization files (Dockerfiles, Docker Compose configs)
├── .gitignore        # Global git exclusion rules
└── README.md         # Project entrypoint documentation
```

### Folder Roles

1. **`backend/`**: Serves as the central backend API. It orchestrates periodic data fetching from the National Water Data Portal (NWDP), writes/reads PostgreSQL database, exposes REST APIs for the React frontend, and communicates with the Python ML service.
2. **`frontend/`**: The client-side dashboard application built with React and Vite. It interacts exclusively with the Express backend.
3. **`ml-service/`**: A dedicated Python/FastAPI microservice executing heavy computation, anomaly detection, data gap-filling, recharge calculation, classification, and forecasting.
4. **`database/`**: Contains schema definitions, migrations, and database initialization files.
5. **`docs/`**: Holds architecture design notes, system flows, and developer guides.
6. **`scripts/`**: Automation scripts to aid in local setup, seed data insertion, and build processes.
7. **`docker/`**: Custom configuration files and multi-stage builds for containerizing each service.
