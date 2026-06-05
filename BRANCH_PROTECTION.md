# Branch Protection Rules

To keep `master` stable, the repository owner should enable the following
branch protection rules in **GitHub → Settings → Branches → Add rule**.

## Required Settings

| Setting | Value | Why |
|---------|-------|-----|
| **Branch name pattern** | `master` | Protect only the main branch |
| **Require a pull request before merging** | ✅ | All changes must go through PR review |
| **Require approvals** | 1 | At least one reviewer must approve |
| **Dismiss stale reviews** | ✅ | New pushes invalidate previous approvals |
| **Require status checks** | ✅ | CI must pass before merge |
| **Require branches to be up to date** | ✅ | PR must be based on latest master |
| **Status checks** | `check` (from CI workflow) | Type-check + build must pass |
| **Require conversation resolution** | ✅ | All comments must be resolved |
| **Do not allow bypassing** | ✅ | Even admins must follow the rules |

## How to Set Up

1. Go to your repo: `https://github.com/OWNER/magick-gui/settings/branches`
2. Click **Add rule** or **Edit** on `master`
3. Check all the boxes listed above
4. Save

## Workflow

```
┌─────────────┐     ┌──────────────────────┐     ┌──────────┐
│ Feature     │────>│ PR → CI checks       │────>│ Merge to │
│ branch      │     │ (lint + build)       │     │ master   │
└─────────────┘     │ + review approval    │     └────┬─────┘
                    └──────────────────────┘          │
                                                      ▼
                                              ┌──────────────┐
                                              │ Tag release  │
                                              │ v1.2.0       │
                                              └──────┬───────┘
                                                     │
                                                     ▼
                                              ┌──────────────┐
                                              │ Release CI    │
                                              │ → .exe        │
                                              │ → GitHub      │
                                              │   Release     │
                                              └──────────────┘
```
