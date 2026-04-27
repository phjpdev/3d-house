import { useRef } from 'react'
import type { ExhibitConfig, HouseConfig } from '../types/house'
import { parseHouseJsonText } from '../lib/houseConfig'

type Props = {
  house: HouseConfig
  onChange: (next: HouseConfig) => void
  onClose: () => void
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

export function OwnerPanel({ house, onChange, onClose }: Props) {
  const importRef = useRef<HTMLInputElement>(null)

  const update = (patch: Partial<HouseConfig>) => {
    onChange({ ...house, ...patch })
  }

  const addExhibit = async (preset: 'wall-left' | 'wall-center' | 'desk') => {
    const id = crypto.randomUUID()
    let exhibit: ExhibitConfig
    if (preset === 'wall-left') {
      exhibit = {
        id,
        kind: 'wall_frame',
        position: [-2.2, 1.45, -3.74],
        rotationY: 0,
        width: 0.85,
        height: 0.64,
        caption: 'New memory — tap to edit this text in exported JSON or replace via upload.',
        title: 'Untitled',
        imageUrl: undefined,
        audioUrl: null,
      }
    } else if (preset === 'wall-center') {
      exhibit = {
        id,
        kind: 'wall_frame',
        position: [0, 1.52, -3.74],
        rotationY: 0,
        width: 1.0,
        height: 0.75,
        caption: 'Describe what visitors should feel when they stand here.',
        title: 'Untitled',
        imageUrl: undefined,
        audioUrl: null,
      }
    } else {
      exhibit = {
        id,
        kind: 'desk_photo',
        position: [2.35, 0.92, -0.9],
        rotationY: -0.35,
        width: 0.28,
        height: 0.35,
        caption: 'A small print resting on the desk, the way it might in a real home.',
        title: 'Desk memory',
        imageUrl: undefined,
        audioUrl: null,
      }
    }
    onChange({ ...house, exhibits: [...house.exhibits, exhibit] })
  }

  const onImageFor = (id: string, file: File | null) => {
    if (!file) return
    void readFileAsDataUrl(file).then((imageUrl) => {
      onChange({
        ...house,
        exhibits: house.exhibits.map((e) =>
          e.id === id ? { ...e, imageUrl } : e,
        ),
      })
    })
  }

  const onAudioFor = (id: string, file: File | null) => {
    if (!file) return
    void readFileAsDataUrl(file).then((audioUrl) => {
      onChange({
        ...house,
        exhibits: house.exhibits.map((e) =>
          e.id === id ? { ...e, audioUrl } : e,
        ),
      })
    })
  }

  const onBgmFile = (file: File | null) => {
    if (!file) return
    void readFileAsDataUrl(file).then((backgroundMusicUrl) => {
      update({ backgroundMusicUrl })
    })
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(house, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${house.id}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const onImportJson = async (file: File | null) => {
    if (!file) return
    const text = await file.text()
    try {
      const next = parseHouseJsonText(text)
      onChange(next)
    } catch {
      alert('Could not parse JSON.')
    }
  }

  return (
    <div className="owner-backdrop">
      <div className="owner-panel">
        <header className="owner-header">
          <h2>Owner tools</h2>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <p className="owner-lede">
          Uploads become data URLs in memory — use <strong>Export JSON</strong> to save a portable
          bundle. For production, swap storage for S3/R2 and keep only URLs in JSON.
        </p>

        <label className="field">
          <span>House name</span>
          <input
            value={house.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </label>

        <label className="field">
          <span>Tagline</span>
          <input
            value={house.tagline ?? ''}
            onChange={(e) => update({ tagline: e.target.value })}
          />
        </label>

        <label className="field">
          <span>Room glTF URL (optional)</span>
          <input
            placeholder="/models/my-room.glb"
            value={house.roomGltfUrl ?? ''}
            onChange={(e) =>
              update({ roomGltfUrl: e.target.value || null })
            }
          />
        </label>

        <label className="field">
          <span>Background music file</span>
          <input type="file" accept="audio/*" onChange={(e) => onBgmFile(e.target.files?.[0] ?? null)} />
        </label>
        {house.backgroundMusicUrl ? (
          <button type="button" className="ghost" onClick={() => update({ backgroundMusicUrl: null })}>
            Clear music
          </button>
        ) : null}

        <div className="owner-actions">
          <button type="button" onClick={() => importRef.current?.click()}>
            Import house JSON
          </button>
          <input
            ref={importRef}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={(e) => void onImportJson(e.target.files?.[0] ?? null)}
          />
          <button type="button" onClick={exportJson}>
            Export JSON
          </button>
        </div>

        <hr className="owner-rule" />

        <p className="owner-section-title">Add a piece</p>
        <div className="owner-row">
          <button type="button" onClick={() => void addExhibit('wall-left')}>
            Wall (left)
          </button>
          <button type="button" onClick={() => void addExhibit('wall-center')}>
            Wall (center)
          </button>
          <button type="button" onClick={() => void addExhibit('desk')}>
            Desk photo
          </button>
        </div>

        <ul className="exhibit-list">
          {house.exhibits.map((ex) => (
            <li key={ex.id} className="exhibit-row">
              <div className="exhibit-meta">
                <strong>{ex.title ?? ex.id}</strong>
                <span className="pill">{ex.kind}</span>
              </div>
              <label className="mini">
                Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onImageFor(ex.id, e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="mini">
                Audio
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => onAudioFor(ex.id, e.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="button"
                className="ghost danger"
                onClick={() =>
                  onChange({
                    ...house,
                    exhibits: house.exhibits.filter((x) => x.id !== ex.id),
                  })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
