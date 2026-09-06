import { readJson, removeRaw, writeJson } from '@/lib/storage'
import { GENERATOR_VERSION } from '@/data/seed/generateCommercialData'
import { normaliseDataset } from './migrations'
import type { CommercialDataset } from '@/domain/commerce'

export const COMMERCIAL_KEY = 'commercial-dataset'

interface StoredDataset {
  /** Identifies the workspace shape the dataset was generated for. */
  baseKey: string
  dataset: CommercialDataset
}

/**
 * Persistence for the commercial dataset.
 *
 * Up to this phase the dataset was regenerated from its seed on every session.
 * Now that opportunities can be created, edited, moved and deleted, the data is
 * the user's: it is generated once per workspace, then owned and persisted.
 *
 * The stored copy is only reused when it was generated for the same workspace
 * shape and by the same generator version. Anything else is regenerated, so a
 * changed generator can never leave half-migrated records behind.
 */
export const localCommercialRepository = {
  load(baseKey: string): CommercialDataset | null {
    const stored = readJson<StoredDataset>(COMMERCIAL_KEY)
    if (!stored || stored.baseKey !== baseKey) return null

    // Everything read back from disk is untrusted. `normaliseDataset` coerces
    // every field or drops the record, so nothing beyond this line can hand a
    // string where the engines expect a number, a probability of 999, or a deal
    // pointing at an owner who no longer exists. It returns null when the
    // stored copy is beyond repair, which regenerates rather than displaying
    // figures derived from wreckage.
    const dataset = normaliseDataset(stored.dataset)
    if (!dataset || dataset.generatorVersion !== GENERATOR_VERSION) return null

    return dataset
  },

  save(baseKey: string, dataset: CommercialDataset): boolean {
    return writeJson(COMMERCIAL_KEY, { baseKey, dataset } satisfies StoredDataset)
  },

  clear(): void {
    removeRaw(COMMERCIAL_KEY)
  },
}
