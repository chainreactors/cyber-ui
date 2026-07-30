import { useCallback } from "react"
import { useFileManagerTranslations } from "../runtime"
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
import { normalizePath, parseFileSize, LARGE_FILE_WARNING_BYTES, HUGE_FILE_WARNING_BYTES } from "../utils/file-manager-utils"
import { fileNodeToEntry, useFileManagerRuntime } from "../runtime"
import { isSameOrDescendantPath, pathsOverlap } from "../path-strategy"

interface UseFileContextMenuParams {
  usesWindowsPaths: boolean
  currentPath: string
  navigateToPath: (path: string) => void
  handleRefreshCurrentDirectory: (targetPath?: string) => Promise<void>
  handleDownload: (node: FileNode) => Promise<void>
  handleRename: (node: FileNode) => void
  handleCopy: (node: FileNode) => Promise<void>
  handleCopyName: (node: FileNode) => Promise<void>
  handleCopyPath: (node: FileNode) => Promise<void>
  handleDelete: (node: FileNode) => Promise<void>
  pendingMutationPaths: ReadonlySet<string>
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
  const t = useFileManagerTranslations()
  const { capabilities, getActions, notify, onOpenFile, renderPreview } = useFileManagerRuntime()
  const {
    usesWindowsPaths,
    currentPath,
    navigateToPath,
    handleRefreshCurrentDirectory,
    handleDownload,
    handleRename,
    handleCopy,
    handleCopyName,
    handleCopyPath,
    handleDelete,
    pendingMutationPaths,
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

  const isPathBusy = useCallback((targetPath: string) => {
    const style = usesWindowsPaths ? 'windows' : 'posix'
    return [...pendingMutationPaths].some((pendingPath) => (
      pathsOverlap(targetPath, pendingPath, style)
    ))
  }, [usesWindowsPaths, pendingMutationPaths])

  const isDirectoryUnavailable = useCallback((targetPath: string) => {
    const style = usesWindowsPaths ? 'windows' : 'posix'
    return [...pendingMutationPaths].some((pendingPath) => (
      isSameOrDescendantPath(targetPath, pendingPath, style)
    ))
  }, [usesWindowsPaths, pendingMutationPaths])

  const getCustomSections = useCallback((
    targetPath: string,
    node?: FileNode,
  ): ContextMenuSection[] => {
    if (!getActions) return []

    const entry = node ? fileNodeToEntry(node) : undefined
    const context = {
      entry,
      selectedEntries: entry ? [entry] : [],
      targetPath,
      location: entry
        ? entry.kind === 'directory' ? 'directory' as const : 'file' as const
        : 'background' as const,
    }
    const actions = getActions(context)
    const toMenuAction = (action: (typeof actions)[number]) => ({
      id: `custom:${action.id}`,
      label: action.label,
      icon: action.icon,
      disabled: action.disabled,
      variant: action.placement === 'danger' ? 'danger' as const : 'default' as const,
      onSelect: () => {
        Promise.resolve(action.run(context)).catch((error) => {
          notify({
            variant: 'destructive',
            title: t('fileError'),
            description: error instanceof Error ? error.message : t('unknownError'),
          })
        })
      },
    })
    const regularActions = actions.filter(action => action.placement !== 'danger').map(toMenuAction)
    const dangerActions = actions.filter(action => action.placement === 'danger').map(toMenuAction)

    return [
      ...(regularActions.length ? [{ actions: regularActions }] : []),
      ...(dangerActions.length ? [{ label: t('dangerZone'), actions: dangerActions }] : []),
    ]
  }, [getActions, notify, t])

  // Generate context menu for directory/blank area
  const generateDirectoryContextMenu = useCallback((targetPath: string): ContextMenuSection[] => {
    const sections: ContextMenuSection[] = []
    const targetBusy = isDirectoryUnavailable(targetPath)

    sections.push({
      label: t('operations'),
      actions: [
        ...(capabilities.mkdir ? [{
          id: 'newFolder',
          label: t('newFolder'),
          icon: <FolderPlus className="w-4 h-4" />,
          disabled: targetBusy,
          onSelect: () => {
            setContextMenuTargetPath(targetPath)
            setShowCreateFolder(true)
          }
        }] : []),
        ...(capabilities.createFile ? [{
          id: 'newFile',
          label: t('newFile'),
          icon: <FilePlus className="w-4 h-4" />,
          disabled: targetBusy,
          onSelect: () => {
            setContextMenuTargetPath(targetPath)
            setShowCreateFile(true)
          }
        }] : []),
        ...(capabilities.upload ? [{
          id: 'upload',
          label: t('upload'),
          icon: <Upload className="w-4 h-4" />,
          disabled: targetBusy,
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

    sections.push(...getCustomSections(targetPath))
    return sections
  }, [t, capabilities, getCustomSections, handleRefreshCurrentDirectory, isDirectoryUnavailable, setContextMenuTargetPath, setShowCreateFolder, setShowCreateFile, setShowUploadDialog, setUploadTargetPath, setSelectedUploadFile])

  // Generate context menu for file/directory node
  const generateContextMenu = useCallback((node: FileNode): ContextMenuSection[] => {
    const sections: ContextMenuSection[] = []
    const nodeBusy = isPathBusy(node.fullPath || node.id)
    const directoryUnavailable = isDirectoryUnavailable(node.fullPath || node.id)

    // For directories, add directory operations at the top
    if (node.isDirectory && node.fullPath) {
      sections.push({
        label: t('directoryOperations'),
        actions: [
          ...(capabilities.mkdir ? [{
            id: 'newFolder',
            label: t('newFolder'),
            icon: <FolderPlus className="w-4 h-4" />,
            disabled: directoryUnavailable,
            onSelect: () => {
              setContextMenuTargetPath(node.fullPath!)
              setShowCreateFolder(true)
            }
          }] : []),
          ...(capabilities.createFile ? [{
            id: 'newFile',
            label: t('newFile'),
            icon: <FilePlus className="w-4 h-4" />,
            disabled: directoryUnavailable,
            onSelect: () => {
              setContextMenuTargetPath(node.fullPath!)
              setShowCreateFile(true)
            }
          }] : []),
          ...(capabilities.upload ? [{
            id: 'upload',
            label: t('upload'),
            icon: <Upload className="w-4 h-4" />,
            disabled: directoryUnavailable,
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
        ...(!node.isDirectory && capabilities.upload ? [{
          id: 'upload',
          label: t('upload'),
          icon: <Upload className="w-4 h-4" />,
          disabled: nodeBusy,
          onSelect: () => {
            const filePath = normalizePath(node.fullPath || node.id, usesWindowsPaths)
            const lastSeparatorIndex = filePath.lastIndexOf('/')
            let parentPath = normalizePath(currentPath, usesWindowsPaths)

            if (lastSeparatorIndex === 0) {
              parentPath = '/'
            } else if (usesWindowsPaths && lastSeparatorIndex === 2 && /^[A-Za-z]:\//.test(filePath)) {
              parentPath = filePath.slice(0, 3)
            } else if (lastSeparatorIndex > 0) {
              parentPath = filePath.slice(0, lastSeparatorIndex)
            }

            setContextMenuTargetPath(parentPath)
            setUploadTargetPath('')
            setSelectedUploadFile(null)
            setShowUploadDialog(true)
          }
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
          disabled: nodeBusy,
          onSelect: () => handleRename(node)
        }] : []),
        ...(capabilities.copy && !node.isDirectory ? [{
          id: 'copy',
          label: t('copy'),
          icon: <Copy className="w-4 h-4" />,
          onSelect: () => handleCopy(node),
          disabled: nodeBusy
        }] : [])
      ]
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

    const customSections = getCustomSections(node.fullPath || node.id, node)
    const customDangerActions = customSections
      .filter(section => section.actions.some(action => action.variant === 'danger'))
      .flatMap(section => section.actions)
    sections.push(...customSections.filter(section => (
      !section.actions.some(action => action.variant === 'danger')
    )))

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

    if (!usesWindowsPaths && capabilities.chmod) {
      infoActions.push({
        id: 'editPermissions',
        label: t('permissions.edit'),
        icon: <Shield className="w-4 h-4" />,
        disabled: nodeBusy,
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
        actions: [
          ...customDangerActions,
          {
            id: 'delete',
            label: t('delete'),
            icon: <X className="w-4 h-4" />,
            variant: 'danger' as const,
            disabled: nodeBusy,
            onSelect: () => handleDelete(node)
          }
        ]
      })
    } else if (customDangerActions.length) {
      sections.push({
        label: t('dangerZone'),
        actions: customDangerActions,
      })
    }

    return sections
  }, [t, capabilities, getCustomSections, handleDownload, handleRename, handleCopy, handleCopyName, handleCopyPath, handleDelete, navigateToPath, handleRefreshCurrentDirectory, usesWindowsPaths, currentPath, isDirectoryUnavailable, isPathBusy, onOpenFile, renderPreview, setContextMenuTargetPath, setShowCreateFolder, setShowCreateFile, setShowUploadDialog, setUploadTargetPath, setSelectedUploadFile, setSelectedPropertyFile, setShowProperties, setSelectedPermissionFile, setShowPermissionEditor, setFileSizeWarning, setSelectedFile])

  return {
    generateDirectoryContextMenu,
    generateContextMenu,
  }
}
