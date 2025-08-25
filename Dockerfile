# This project uses the shared NodeDocker image/entrypoint.
# Build from repo root using the shared Dockerfile:
#   docker build -f NodeDocker/Dockerfile -t nudeflow:local NodeDocker
# Run and point it at the correct repo/ref:
#   docker run --rm -p 3001:8080 -e APP_REPO=gabriel20xx/NudeFlow -e APP_REF=master -e NPM_TOKEN=$env:NPM_TOKEN nudeflow:local
