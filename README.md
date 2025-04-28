# Automatic Synchronization from `mycard/pre-release-database-cdb`

This repository uses a GitHub Action to **keep the `master` branch updated** by syncing daily with the remote repository [`mycard/pre-release-database-cdb`](https://code.moenext.com/mycard/pre-release-database-cdb.git).

## How It Works

- **Frequency:** Every day at **07:00 UTC** or manually through GitHub Actions.
- **Process:** The repository is cloned, the latest changes from `upstream` are fetched, the local content is updated, and the `master` branch is force-pushed.
- **Commit Identity:** Changes are committed under the `Evolution Bot` identity.

## Branch Structure

- **`sync`:** Contains only the synchronization workflow.
- **`master`:** Contains the synchronized content from the remote repository.

## Notes

- The `master` branch is **fully overwritten** with each synchronization.
- Manual changes to `master` will be lost during the next sync.