#!/bin/bash
set -e

PGDATA=/var/lib/postgresql/data

# Wait for primary to be ready
until pg_isready -h pg-primary -p 5432 -U postgres; do
    echo "Waiting for primary..."
    sleep 2
done

# Only run base backup if data directory is empty
if [ -z "$(ls -A $PGDATA)" ]; then
    echo "Running pg_basebackup from primary..."
    PGPASSWORD=replicator_pass pg_basebackup \
        -h pg-primary \
        -p 5432 \
        -U replicator \
        -D "$PGDATA" \
        -Fp -Xs -R -P

    echo "Base backup complete. Starting in standby mode."
fi

exec postgres
