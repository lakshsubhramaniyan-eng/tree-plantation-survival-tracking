import { useEffect, useState, type FormEvent } from 'react'
import './ObservationUpload.css'

type UploadSite = {
  _id: string
  name: string
  region: string
}

type UploadResponse = {
  imported?: number
  error?: string
}

type ObservationUploadProps = {
  token: string
  onClose: () => void
}

const maxFileBytes = 2 * 1024 * 1024

export function ObservationUpload({ token, onClose }: ObservationUploadProps) {
  const [sites, setSites] = useState<UploadSite[]>([])
  const [siteId, setSiteId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [isLoadingSites, setIsLoadingSites] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [importedCount, setImportedCount] = useState<number | null>(null)

  useEffect(() => {
    let isCurrent = true

    fetch('/api/sites', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) {
          const result = await response.json() as UploadResponse
          throw new Error(result.error ?? 'Could not load active sites')
        }
        return response.json() as Promise<UploadSite[]>
      })
      .then((activeSites) => {
        if (isCurrent) {
          setSites(activeSites)
          setSiteId(activeSites[0]?._id ?? '')
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load active sites')
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingSites(false)
      })

    return () => { isCurrent = false }
  }, [token])

  const selectFile = (selectedFile: File | undefined): boolean => {
    setError('')
    setFile(null)
    if (!selectedFile) return true
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Choose a CSV file.')
      return false
    }
    if (selectedFile.size > maxFileBytes) {
      setError('CSV files must be 2 MB or smaller.')
      return false
    }
    setFile(selectedFile)
    return true
  }

  const downloadTemplate = () => {
    const template = new Blob(['observedBy,survivingTrees,observedAt,plotId,notes\n'], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(template)
    const link = document.createElement('a')
    link.href = url
    link.download = 'treebase-observations-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!siteId || !file) {
      setError('Choose an active site and a CSV file.')
      return
    }

    setIsUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch(`/api/sites/${siteId}/observations/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      const result = await response.json() as UploadResponse
      if (!response.ok || result.imported === undefined) {
        setError(result.error ?? 'The CSV could not be imported.')
        return
      }
      setImportedCount(result.imported)
    } catch {
      setError('Could not reach the server. Check that the API is running and try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="upload-overlay">
      <section className="upload-dialog" role="dialog" aria-modal="true" aria-labelledby="upload-title">
        <div className="upload-dialog-heading">
          <div>
            <p className="eyebrow">Field observations</p>
            <h2 id="upload-title">Upload a CSV</h2>
          </div>
          <button className="upload-close" type="button" onClick={onClose} aria-label="Close upload dialog">×</button>
        </div>

        {importedCount === null ? (
          <>
            <p className="upload-description">Import up to 500 observations for one site. Files must be 2 MB or smaller.</p>
            <button className="upload-template" type="button" onClick={downloadTemplate}>Download CSV template</button>
            <form className="upload-form" onSubmit={upload}>
              <label htmlFor="upload-site">Plantation site</label>
              <select
                id="upload-site"
                required
                value={siteId}
                onChange={(event) => setSiteId(event.target.value)}
                disabled={isLoadingSites || sites.length === 0}
              >
                <option value="" disabled>{isLoadingSites ? 'Loading sites…' : 'Select an active site'}</option>
                {sites.map((site) => (
                  <option key={site._id} value={site._id}>{site.name} — {site.region}</option>
                ))}
              </select>
              {!isLoadingSites && sites.length === 0 && !error && (
                <p className="upload-help">No active sites are available to receive observations.</p>
              )}

              <label htmlFor="observations-file">CSV file</label>
              <input
                id="observations-file"
                type="file"
                accept=".csv,text/csv"
                required
                onChange={(event) => {
                  if (!selectFile(event.currentTarget.files?.[0])) event.currentTarget.value = ''
                }}
                disabled={isUploading}
              />
              <p className="upload-help">
                Required columns: <code>observedBy</code>, <code>survivingTrees</code>. Optional: <code>observedAt</code>, <code>plotId</code>, <code>notes</code>.
              </p>
              {file && <p className="upload-file-name">Selected: {file.name}</p>}
              {error && <p className="upload-error" role="alert">{error}</p>}
              <div className="upload-actions">
                <button className="button button--outline" type="button" onClick={onClose}>Cancel</button>
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={isLoadingSites || sites.length === 0 || isUploading}
                >
                  {isUploading ? 'Uploading…' : 'Upload observations'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="upload-success" role="status">
            <strong>{importedCount} {importedCount === 1 ? 'observation' : 'observations'} imported</strong>
            <p>Your field observations were added to the selected site.</p>
            <button className="button button--primary" type="button" onClick={onClose}>Done</button>
          </div>
        )}
      </section>
    </div>
  )
}
