import { useCallback } from "react"
import { useTranslations } from "../runtime"
import type { ContextMenuSection } from "../ui"
import {
  FolderPlus,
  FilePlus,
  Upload,
  RefreshCw,
  Eye,
  Download,
  Edit,
  Copy,
  Info,
  Shield,
  X,
} from "../icons"
import type { FileNode } from "../types"
import { parseFileSize, LARGE_FILE_WARNING_BYTES, HUGE_FILE_WARNING_BYTES } from "../utils/file-manager-utils"
import { useFileManagerRuntime } from "../runtime"

interface UseFileContextMenuParams {
  isWindowsSession: boolean
  onOpenTab?: (title: string, module: string, subModule?: string, component?: unknown) => void
  sessionId: string
  navigateToPath: (path: string) => void
  handleRefreshCurrentDirectory: (targetPath?: string) => Promise<void>
  handleDownload: (node: FileNode) => Promise<void>
  handleRename: (node: FileNode) => void
  handleCopy: (node: FileNode) => Promise<void>
  handleCopyName: (node: FileNode) => Promise<void>
  handleCopyPath: (node: FileNode) => Promise<void>
  handleDelete: (node: FileNode) => Promise<void>
  setContextMenuTargetPath: (path: string | null) => void
  setShowCreateFolder: (show: boolean) => void
  setShowCreateFile: (show: boolean) => void
  setShowUploadDialog: (show: boolean) => void
  setUploadTargetPath: (path: string) => void
  setSelectedUploadFile: (file: File | null) => void
  setSelectedPropertyFile: (file: FileNode | null) => void
  setShowProperties: (show: boolean) => void
  setSelectedPermissionFile: (file: FileNode | null) => void
  setShowPermissionEditor: (show: boolean) => void
  setFileSizeWarning: (warning: { file: FileNode; sizeInBytes: number } | null) => void
  setSelectedFile: (file: FileNode | null) => void
}

export function useFileContextMenu(params: UseFileContextMenuParams) {
  const t = useTranslations('Sessions.fileManagement')
  const { capabilities, onOpenFile, renderPreview } = useFileManagerRuntime()
  const {
    isWindowsSession,
    onOpenTab,
    sessionId,
    navigateToPath,
    handleRefreshCurrentDirectory,
    handleDownload,
    handleRename,
    handleCopy,
    handleCopyName,
    handleCopyPath,
    handleDelete,
    setContextMenuTargetPath,
    setShowCreateFolder,
    setShowCreateFile,
    setShowUploadDialog,
    setUploadTargetPath,
    setSelectedUploadFile,
    setSelectedPropertyFile,
    setShowProperties,
    setSelectedPermissionFile,
    setShowPermissionEditor,
    setFileSizeWarning,
    setSelectedFile,
  } = params

  // Generate context menu for directory/blank area
  const generateDirectoryContextMenu = useCallback((targetPath: string): ContextMenuSection[] => {
    const sections: ContextMenuSection[] = []

    sections.push({
      label: t('operations'),
      actions: [
        ...(capabilities.mkdir ? [{
          id: 'newFolder',
          label: t('newFolder'),
          icon: <FolderPlus className="w-4 h-4" />,
          onSelect: () => {
            setContextMenuTargetPath(targetPath)
            setShowCreateFolder(true)
          }
        }] : []),
        ...(capabilities.createFile ? [{
          id: 'newFile',
          label: t('newFile'),
          icon: <FilePlus className="w-4 h-4" />,
          onSelect: () => {
            setContextMenuTargetPath(targetPath)
            setShowCreateFile(true)
          }
        }] : []),
        ...(capabilities.upload ? [{
          id: 'upload',
          label: t('upload'),
          icon: <Upload className="w-4 h-4" />,
          onSelect: () => {
            setContextMenuTargetPath(targetPath)
            setUploadTargetPath('')
            setSelectedUploadFile(null)
            setShowUploadDialog(true)
          }
        }] : []),
        {
          id: 'refresh',
          label: t('refresh'),
          icon: <RefreshCw className="w-4 h-4" />,
          onSelect: () => {
            handleRefreshCurrentDirectory(targetPath)
          }
        }
      ]
    })

    return sections
  }, [t, capabilities, handleRefreshCurrentDirectory, setContextMenuTargetPath, setShowCreateFolder, setShowCreateFile, setShowUploadDialog, setUploadTargetPath, setSelectedUploadFile])

  // Generate context menu for file/directory node
  const generateContextMenu = useCallback((node: FileNode): ContextMenuSection[] => {
    const sections: ContextMenuSection[] = []

    // For directories, add directory operations at the top
    if (node.isDirectory && node.fullPath) {
      sections.push({
        label: t('directoryOperations'),
        actions: [
          ...(capabilities.mkdir ? [{
            id: 'newFolder',
            label: t('newFolder'),
            icon: <FolderPlus className="w-4 h-4" />,
            onSelect: () => {
              setContextMenuTargetPath(node.fullPath!)
              setShowCreateFolder(true)
            }
          }] : []),
          ...(capabilities.createFile ? [{
            id: 'newFile',
            label: t('newFile'),
            icon: <FilePlus className="w-4 h-4" />,
            onSelect: () => {
              setContextMenuTargetPath(node.fullPath!)
              setShowCreateFile(true)
            }
          }] : []),
          ...(capabilities.upload ? [{
            id: 'upload',
            label: t('upload'),
            icon: <Upload className="w-4 h-4" />,
            onSelect: () => {
              setContextMenuTargetPath(node.fullPath!)
              setUploadTargetPath('')
              setSelectedUploadFile(null)
              setShowUploadDialog(true)
            }
          }] : []),
          {
            id: 'refresh',
            label: t('refresh'),
            icon: <RefreshCw className="w-4 h-4" />,
            onSelect: () => {
              handleRefreshCurrentDirectory(node.fullPath!)
            }
          }
        ]
      })
    }

    // File operations
    sections.push({
      label: t('operations'),
      actions: [
        ...(capabilities.preview || node.isDirectory ? [{
          id: 'open',
          label: t('open'),
          icon: <Eye className="w-4 h-4" />,
          onSelect: () => {
            if (node.isDirectory && node.fullPath) {
              navigateToPath(node.fullPath)
            } else if (!node.isDirectory && node.fullPath) {
              const fileSizeInBytes = parseFileSize(node.size)

              if (fileSizeInBytes >= HUGE_FILE_WARNING_BYTES) {
                setFileSizeWarning({ file: node, sizeInBytes: fileSizeInBytes })
              } else if (fileSizeInBytes >= LARGE_FILE_WARNING_BYTES) {
                setFileSizeWarning({ file: node, sizeInBytes: fileSizeInBytes })
              } else if (onOpenFile) {
                onOpenFile(node)
              } else if (renderPreview) {
                setSelectedFile(node)
              }
            }
          }
        }] : []),
        ...(onOpenTab ? [{
          id: 'openInNewTab',
          label: t('openInNewTab'),
          icon: <FilePlus className="w-4 h-4" />,
          onSelect: () => {
            if (!node.isDirectory && onOpenTab && node.fullPath) {
              onOpenTab(
                node.name,
                'FileViewer',
                `${sessionId}|${node.fullPath}|${node.name}`
              )
            }
          },
          disabled: node.isDirectory
        }] : []),
        ...(capabilities.download ? [{
          id: 'download',
          label: t('download'),
          icon: <Download className="w-4 h-4" />,
          onSelect: () => handleDownload(node)
        }] : []),
        ...(capabilities.rename ? [{
          id: 'rename',
          label: t('rename'),
          icon: <Edit className="w-4 h-4" />,
          onSelect: () => handleRename(node)
        }] : []),
        ...(capabilities.copy ? [{
          id: 'copy',
          label: t('copy'),
          icon: <Copy className="w-4 h-4" />,
          onSelect: () => handleCopy(node),
          disabled: node.isDirectory
        }] : [])
      ].filter(action => !action.disabled)
    })

    // Copy operations
    sections.push({
      label: t('copyOperations'),
      actions: [
        {
          id: 'copyName',
          label: t('copyName'),
          icon: <Copy className="w-4 h-4" />,
          onSelect: () => handleCopyName(node)
        },
        {
          id: 'copyPath',
          label: t('copyPath'),
          icon: <Copy className="w-4 h-4" />,
          onSelect: () => handleCopyPath(node)
        }
      ]
    })

    // Properties and Permissions
    const infoActions: ContextMenuSection['actions'] = [
      {
        id: 'properties',
        label: t('properties.title'),
        icon: <Info className="w-4 h-4" />,
        onSelect: () => {
          setSelectedPropertyFile(node)
          setShowProperties(true)
        }
      }
    ]

    if (!isWindowsSession && capabilities.chmod) {
      infoActions.push({
        id: 'editPermissions',
        label: t('permissions.edit'),
        icon: <Shield className="w-4 h-4" />,
        onSelect: () => {
          setSelectedPermissionFile(node)
          setShowPermissionEditor(true)
        }
      })
    }

    sections.push({
      label: t('fileDetails'),
      actions: infoActions
    })

    // Danger zone
    if (capabilities.remove) {
      sections.push({
        label: t('dangerZone'),
        actions: [{
          id: 'delete',
          label: t('delete'),
          icon: <X className="w-4 h-4" />,
          variant: 'danger' as const,
          onSelect: () => handleDelete(node)
        }]
      })
    }

    return sections
  }, [t, capabilities, handleDownload, handleRename, handleCopy, handleCopyName, handleCopyPath, handleDelete, navigateToPath, handleRefreshCurrentDirectory, isWindowsSession, onOpenFile, renderPreview, onOpenTab, sessionId, setContextMenuTargetPath, setShowCreateFolder, setShowCreateFile, setShowUploadDialog, setUploadTargetPath, setSelectedUploadFile, setSelectedPropertyFile, setShowProperties, setSelectedPermissionFile, setShowPermissionEditor, setFileSizeWarning, setSelectedFile])

  return {
    generateDirectoryContextMenu,
    generateContextMenu,
  }
}
