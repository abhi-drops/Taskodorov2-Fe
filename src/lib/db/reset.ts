import { withDb, seedIfEmpty } from './sqlite'
import { listWorkspaces, deleteWorkspace } from './workspaces'

export async function resetToDefault(): Promise<void> {
  const workspaces = await listWorkspaces()
  for (const workspace of workspaces) {
    await deleteWorkspace(workspace.id)
  }
  await withDb(async (db) => {
    await seedIfEmpty(db)
  })
}
