# Deployment

Everything needed to run CourseMate with Docker lives in this directory. Copy it to your
server as-is; the application source is not required.

```
deploy/
├── docker-compose.yml            Default: app only, external PostgreSQL + Redis
├── docker-compose.sqlite.yml     Lightweight: app only, SQLite + in-memory cache
├── docker-compose.full.yml       Full: app + PostgreSQL + Redis containers
├── .env.example                  Optional image and host-port overrides
├── config.example.yaml           Template for the default profile (also used for local development)
├── config.sqlite.example.yaml    Template for the lightweight profile
├── config.full.example.yaml      Template for the full profile
├── services/                     Optional document extraction / OCR services
└── windows/                      Desktop client rollout on managed Windows (MSI, portable, Group Policy)
```

Rolling out the desktop client to managed Windows machines is covered separately in
[`windows/README.md`](windows/README.md).

## Run

Pick one profile, copy its template to `config.yaml` **in this directory**, then start it:

```bash
cd deploy
cp config.sqlite.example.yaml config.yaml
docker compose -f docker-compose.sqlite.yml up -d
```

Copy `.env.example` to `.env` only if you need to override the image or host
ports. The defaults already keep CourseMate separate from a DEEIX Chat stack.

CourseMate uses its own Compose project and resource names: `coursemate`,
`coursemate-network`, `coursemate-app-data`, and `coursemate-app-storage`. The
application is exposed on `127.0.0.1:8081` by default, so an existing DEEIX Chat
stack that uses the `deeix-chat` project name and port 8080 can continue running.

Override the host port when 8081 is already occupied:

```bash
COURSEMATE_HOST_PORT=8090 docker compose -f docker-compose.sqlite.yml up -d
```

When the host port changes, update `server.cors_allow_origin`,
`server.public_api_base_url`, and `server.public_web_base_url` in `config.yaml`
to match. Never run `docker compose down -v` while migrating an existing
installation: that deletes the persistent volumes.

### Migrating a previous CourseMate deployment

Earlier CourseMate compose files reused the DEEIX Chat project, container,
network, volume, and port names. If one of those deployments already replaced
your DEEIX Chat stack, stop it without deleting volumes and preserve a copy of
the current data before starting this revision:

```bash
# Inspect first; do not delete either stack's volumes.
docker compose ls
docker volume ls | grep deeix-chat

# Copy the data currently used by the earlier CourseMate deployment.
docker volume create coursemate-app-data
docker volume create coursemate-app-storage
docker run --rm -v deeix-chat-app-data:/from:ro -v coursemate-app-data:/to alpine \
  sh -c 'cp -a /from/. /to/'
docker run --rm -v deeix-chat-app-storage:/from:ro -v coursemate-app-storage:/to alpine \
  sh -c 'cp -a /from/. /to/'

# Full profile only: preserve PostgreSQL data. Redis is only a cache.
docker volume create coursemate-postgres-data
docker run --rm -v deeix-chat-postgres-data:/from:ro -v coursemate-postgres-data:/to alpine \
  sh -c 'cp -a /from/. /to/'
```

Then start the new stack from this directory. The copied data is owned by the
copied stack; do not mount the old `deeix-chat-*` volumes into CourseMate.
If CourseMate previously ran migrations against DEEIX Chat data, restore the
DEEIX deployment and its database from the backup taken before that deployment;
the migration cannot reconstruct the original database in place.

Every compose file mounts `./config.yaml` (relative to this directory) to `/app/config.yaml`.
`deploy/config.yaml` is git-ignored and excluded from the image build context.

The full guide, including profile trade-offs, persistence paths and optional services, is in the
[root README](../README.md#docker-deployment).

## Build a local image

The application image is built from the repository root:

```bash
docker build -t coursemate:local .
cd deploy && COURSEMATE_IMAGE=coursemate:local docker compose up -d
```

## Optional services

Each service under `services/` is self-contained (its own build context) and attaches to
`coursemate-network`, so start an application profile first:

```bash
docker compose -f services/tika/docker-compose.yml up -d
docker compose -f services/tesseract/docker-compose.yml up -d --build
docker compose -f services/docling/docker-compose.yml up -d --build
```
