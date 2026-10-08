import { useEffect, useState } from 'react'
import type { MediaContent } from '@cyber/aop'
import { FileResourceCard } from '@cyber/file-manager'

/** Hosts resolve URI resources through their authenticated transport. */
export type ToolMediaResolver = (media: MediaContent, index: number, eventId?: string, download?: boolean) => string | undefined

export interface MediaPreviewLabels {
  download: string
  openImage: string
  unavailable: string
  loadFailed: string
}

const defaults: MediaPreviewLabels = {
  download: 'Download', openImage: 'Open image', unavailable: 'Media unavailable', loadFailed: 'Failed to load media',
}

export interface MediaPreviewProps {
  media: MediaContent
  src?: string
  downloadURL?: string
  labels?: Partial<MediaPreviewLabels>
  testIdPrefix?: string
}

/** Inline bytes and host-resolved resources share the same file/media view. */
export function MediaPreview({ media, src: remoteURL, downloadURL, labels, testIdPrefix = 'tool' }: MediaPreviewProps) {
  const l = { ...defaults, ...labels }
  const resource = media.resource
  const mediaType = resource?.mediaType || (media.kind === 'video' ? 'video/mp4' : media.kind === 'image' ? 'image/png' : 'application/octet-stream')
  const data = resource?.source.case === 'data' ? resource.source.value : undefined
  const [objectURL, setObjectURL] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!data?.length) { setObjectURL(''); return }
    const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: mediaType }))
    setObjectURL(url)
    return () => URL.revokeObjectURL(url)
  }, [data, mediaType])
  const src = data?.length ? objectURL : remoteURL || ''
  useEffect(() => { setFailed(false) }, [src])
  const filename = resource?.filename || (media.kind === 'video' ? 'record.mp4' : media.kind === 'image' ? 'screenshot.png' : 'file')
  const download = downloadURL || objectURL
  const image = ['image/png', 'image/jpeg', 'image/webp'].includes(mediaType)
  const video = mediaType === 'video/mp4'
  const previewable = image || video
  if (!src && !download && !data?.length) {
    return <p role="alert" className="text-xs text-warning">{l.unavailable}</p>
  }
  return <div data-testid={`${testIdPrefix}-media`}>
    <FileResourceCard filename={filename} downloadURL={download} downloadLabel={l.download}>
      {src && previewable && (video
        ? <video controls preload="metadata" playsInline src={src} aria-label={filename} onError={() => setFailed(true)}
            className="max-h-[28rem] w-full rounded-md bg-black" data-testid={`${testIdPrefix}-video`} />
        : <a href={src} target="_blank" rel="noreferrer" aria-label={l.openImage}>
            <img src={src} alt={filename} onError={() => setFailed(true)} className="max-h-[28rem] w-full rounded-md object-contain" data-testid={`${testIdPrefix}-image`} />
          </a>)}
      {failed && <p role="alert" className="text-xs text-warning">{l.loadFailed}</p>}
    </FileResourceCard>
  </div>
}
