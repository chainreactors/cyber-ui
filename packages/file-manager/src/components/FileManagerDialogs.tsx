import React from "react"
import { useTranslations } from "../runtime"
import { Button, Input } from "../ui"
import { Dialog, DialogContent, DialogTitle } from "../ui"
import {
  Upload,
  RefreshCw,
  AlertTriangle,
} from "../icons"
import type { FileNode, UploadQueueState, DownloadQueueState } from "../types"
import { formatFileSize } from "../utils/file-manager-utils"
import { useFileManagerRuntime } from "../runtime"
import { UploadProgressDialog } from "./UploadProgressDialog"
import { DownloadProgressDialog } from "./DownloadProgressDialog"
import { FilePropertiesDialog } from "./FilePropertiesDialog"
import { PermissionEditor } from "./PermissionEditor"

interface FileManagerDialogsProps {
  sessionId: string
  isWindowsSession: boolean
  // File preview
  selectedFile: FileNode | null
  setSelectedFile: (file: FileNode | null) => void
  // File input ref
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
  // Create folder dialog
  showCreateFolder: boolean
  setShowCreateFolder: (show: boolean) => void
  newFolderName: string
  setNewFolderName: (name: string) => void
  creatingFolder: boolean
  handleCreateFolder: (targetPath?: string) => Promise<void>
  contextMenuTargetPath: string | null
  setContextMenuTargetPath: (path: string | null) => void
  // Create file dialog
  showCreateFile: boolean
  setShowCreateFile: (show: boolean) => void
  newFileName: string
  setNewFileName: (name: string) => void
  creatingFile: boolean
  handleCreateFile: (targetPath?: string) => Promise<void>
  // Rename dialog
  showRenameDialog: boolean
  setShowRenameDialog: (show: boolean) => void
  renameTarget: { id: string; name: string; path: string } | null
  setRenameTarget: (target: { id: string; name: string; path: string } | null) => void
  newName: string
  setNewName: (name: string) => void
  renaming: boolean
  executeRename: () => Promise<void>
  // Upload dialog
  showUploadDialog: boolean
  setShowUploadDialog: (show: boolean) => void
  selectedUploadFile: File | null
  setSelectedUploadFile: (file: File | null) => void
  uploadTargetPath: string
  setUploadTargetPath: (path: string) => void
  uploading: boolean
  executeUpload: () => Promise<void>
  // File size warning
  fileSizeWarning: { file: FileNode; sizeInBytes: number } | null
  setFileSizeWarning: (warning: { file: FileNode; sizeInBytes: number } | null) => void
  // Upload progress
  showUploadProgress: boolean
  setShowUploadProgress: (show: boolean) => void
  uploadQueue: UploadQueueState
  setUploadQueue: (queue: UploadQueueState) => void
  // Download progress
  showDownloadProgress: boolean
  setShowDownloadProgress: (show: boolean) => void
  downloadQueue: DownloadQueueState
  setDownloadQueue: (queue: DownloadQueueState) => void
  // File properties
  showProperties: boolean
  setShowProperties: (show: boolean) => void
  selectedPropertyFile: FileNode | null
  // Permission editor
  showPermissionEditor: boolean
  setShowPermissionEditor: (show: boolean) => void
  selectedPermissionFile: FileNode | null
  handleSavePermissions: (mode: number) => Promise<void>
}

export function FileManagerDialogs({
  sessionId,
  isWindowsSession,
  selectedFile,
  setSelectedFile,
  fileInputRef,
  handleFileSelect,
  showCreateFolder,
  setShowCreateFolder,
  newFolderName,
  setNewFolderName,
  creatingFolder,
  handleCreateFolder,
  contextMenuTargetPath,
  setContextMenuTargetPath,
  showCreateFile,
  setShowCreateFile,
  newFileName,
  setNewFileName,
  creatingFile,
  handleCreateFile,
  showRenameDialog,
  setShowRenameDialog,
  renameTarget,
  setRenameTarget,
  newName,
  setNewName,
  renaming,
  executeRename,
  showUploadDialog,
  setShowUploadDialog,
  selectedUploadFile,
  setSelectedUploadFile,
  uploadTargetPath,
  setUploadTargetPath,
  uploading,
  executeUpload,
  fileSizeWarning,
  setFileSizeWarning,
  showUploadProgress,
  setShowUploadProgress,
  uploadQueue,
  setUploadQueue,
  showDownloadProgress,
  setShowDownloadProgress,
  downloadQueue,
  setDownloadQueue,
  showProperties,
  setShowProperties,
  selectedPropertyFile,
  showPermissionEditor,
  setShowPermissionEditor,
  selectedPermissionFile,
  handleSavePermissions,
}: FileManagerDialogsProps) {
  const t = useTranslations('Sessions.fileManagement')
  const { renderPreview } = useFileManagerRuntime()

  return (
    <>
      {/* File Preview Dialog */}
      <Dialog open={!!selectedFile?.fullPath} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <DialogContent
          hideCloseButton
          className="max-w-none p-0 gap-0 w-[85vw] h-[80vh] flex flex-col"
        >
          <DialogTitle className="sr-only">{selectedFile?.name}</DialogTitle>
          <div className="flex-1 overflow-hidden">
            {selectedFile?.fullPath && renderPreview?.(selectedFile)}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for upload dialog */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        multiple={false}
      />

      {/* Create folder dialog */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-96">
            <h3 className="text-lg font-normal mb-4">{t('createFolder')}</h3>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t('folderName')}
              className="w-full mb-4"
              disabled={creatingFolder}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim() && !creatingFolder) {
                  handleCreateFolder(contextMenuTargetPath || undefined)
                } else if (e.key === 'Escape') {
                  setShowCreateFolder(false)
                  setNewFolderName('')
                  setContextMenuTargetPath(null)
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateFolder(false)
                  setNewFolderName('')
                  setContextMenuTargetPath(null)
                }}
                disabled={creatingFolder}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => handleCreateFolder(contextMenuTargetPath || undefined)}
                disabled={!newFolderName.trim() || creatingFolder}
              >
                {creatingFolder ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {t('creating')}
                  </>
                ) : (
                  t('create')
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create file dialog */}
      {showCreateFile && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-96">
            <h3 className="text-lg font-normal mb-4">{t('newFile')}</h3>
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder={t('fileName')}
              className="w-full mb-4"
              disabled={creatingFile}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFileName.trim() && !creatingFile) {
                  handleCreateFile(contextMenuTargetPath || undefined)
                } else if (e.key === 'Escape') {
                  setShowCreateFile(false)
                  setNewFileName('')
                  setContextMenuTargetPath(null)
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateFile(false)
                  setNewFileName('')
                  setContextMenuTargetPath(null)
                }}
                disabled={creatingFile}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => handleCreateFile(contextMenuTargetPath || undefined)}
                disabled={!newFileName.trim() || creatingFile}
              >
                {creatingFile ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {t('creating')}
                  </>
                ) : (
                  t('create')
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rename dialog */}
      {showRenameDialog && renameTarget && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-96">
            <h3 className="text-lg font-normal mb-4">{t('renameFile')}</h3>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('newName')}
              className="w-full mb-2"
              disabled={renaming}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim() && newName !== renameTarget.name && !renaming) {
                  executeRename()
                } else if (e.key === 'Escape') {
                  setShowRenameDialog(false)
                  setRenameTarget(null)
                  setNewName('')
                }
              }}
              autoFocus
            />
            <p className="text-sm text-muted-foreground mb-4">
              {t('currentName')}: {renameTarget.name}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRenameDialog(false)
                  setRenameTarget(null)
                  setNewName('')
                }}
                disabled={renaming}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={executeRename}
                disabled={!newName.trim() || newName === renameTarget.name || renaming}
              >
                {renaming ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {t('renaming')}
                  </>
                ) : (
                  t('rename')
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-96">
            <h3 className="text-lg font-normal mb-4">{t('upload')}</h3>

            {/* File selection */}
            <div className="mb-4">
              <label className="block text-sm font-normal text-foreground mb-2">
                {t('selectFile')}
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  {selectedUploadFile ? t('changeFile') : t('selectFile')}
                </Button>
                {selectedUploadFile && (
                  <span className="text-sm text-muted-foreground truncate flex-1" title={selectedUploadFile.name}>
                    {selectedUploadFile.name} ({(selectedUploadFile.size / 1024).toFixed(2)} KB)
                  </span>
                )}
              </div>
            </div>

            {/* Target path input */}
            <div className="mb-4">
              <label className="block text-sm font-normal text-foreground mb-2">
                {t('targetPath')} ({t('optional')})
              </label>
              <Input
                value={uploadTargetPath}
                onChange={(e) => setUploadTargetPath(e.target.value)}
                placeholder={t('targetPathPlaceholder')}
                className="w-full"
                disabled={uploading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && selectedUploadFile && !uploading) {
                    executeUpload()
                  } else if (e.key === 'Escape') {
                    setShowUploadDialog(false)
                    setSelectedUploadFile(null)
                    setUploadTargetPath('')
                    setContextMenuTargetPath(null)
                  }
                }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadDialog(false)
                  setSelectedUploadFile(null)
                  setUploadTargetPath('')
                  setContextMenuTargetPath(null)
                }}
                disabled={uploading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={executeUpload}
                disabled={!selectedUploadFile || uploading}
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {t('uploading')}
                  </>
                ) : (
                  t('upload')
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* File Size Warning Dialog */}
      {fileSizeWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-lg font-normal text-card-foreground">
              <AlertTriangle className="h-5 w-5 text-chart-4" />
              {t('largeFileWarning')}
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>
                {t('largeFileWarningDesc', {
                  fileName: fileSizeWarning.file.name,
                  size: fileSizeWarning.file.size || formatFileSize(fileSizeWarning.sizeInBytes)
                })}
              </p>
              <p>
                      {fileSizeWarning.sizeInBytes >= 100 * 1024 * 1024
                        ? t('largeFileWarning100MB')
                        : t('largeFileWarning10MB')}
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setFileSizeWarning(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => {
                  setSelectedFile(fileSizeWarning.file)
                  setFileSizeWarning(null)
                }}
              >
                {t('openAnyway')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Dialog */}
      <UploadProgressDialog
        open={showUploadProgress}
        onOpenChange={setShowUploadProgress}
        progresses={uploadQueue.progresses}
        currentIndex={uploadQueue.currentIndex}
        totalFiles={uploadQueue.totalFiles}
        onCancel={() => {
          setShowUploadProgress(false)
          setUploadQueue({
            files: [],
            progresses: new Map(),
            currentIndex: 0,
            totalFiles: 0,
          })
        }}
      />

      {/* File Properties Dialog */}
      <FilePropertiesDialog
        open={showProperties}
        onOpenChange={setShowProperties}
        file={selectedPropertyFile}
        isWindows={isWindowsSession}
      />

      {/* Permission Editor Dialog */}
      <PermissionEditor
        open={showPermissionEditor}
        onOpenChange={setShowPermissionEditor}
        file={selectedPermissionFile}
        onSave={handleSavePermissions}
      />
    </>
  )
}
