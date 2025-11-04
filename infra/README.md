# Infrastructure notes

The root `docker-compose.yml` is the local development topology. It version-constrains PostgreSQL and pins the etcd, MinIO, and Milvus releases used together; review dependency updates before merging them. Data is persisted in named Docker volumes.

Do not deploy that Compose file as production infrastructure. Production requires private networking, managed secrets/KMS, TLS, automated backups and restore drills, monitoring, resource limits, supported upgrades, and separate application/migration identities. See [../docs/operations.md](../docs/operations.md).

Milvus, etcd, and MinIO are a compatibility unit. Upgrade them only after reviewing the Milvus release path and testing backup/restore. Keep embedding-model/collection migrations separate from infrastructure major-version changes.
