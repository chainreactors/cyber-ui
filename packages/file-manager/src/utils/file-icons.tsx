import {
  File,
  FileText,
  FileCode2,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  Database,
  FileSpreadsheet,
  FileJson,
  Folder,
  FolderOpen,
} from '../icons'

export type FileIconType =
  | 'code'
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'database'
  | 'spreadsheet'
  | 'json'
  | 'pdf'
  | 'document'
  | 'folder'
  | 'file'

// 扩展名到图标类型的映射
const extensionMap: Record<string, FileIconType> = {
  // Code files
  '.js': 'code',
  '.jsx': 'code',
  '.ts': 'code',
  '.tsx': 'code',
  '.mjs': 'code',
  '.cjs': 'code',
  '.py': 'code',
  '.java': 'code',
  '.cpp': 'code',
  '.c': 'code',
  '.h': 'code',
  '.hpp': 'code',
  '.go': 'code',
  '.rs': 'code',
  '.php': 'code',
  '.rb': 'code',
  '.swift': 'code',
  '.kt': 'code',
  '.scala': 'code',
  '.sh': 'code',
  '.bash': 'code',
  '.zsh': 'code',
  '.ps1': 'code',
  '.bat': 'code',
  '.cmd': 'code',

  // Text files
  '.txt': 'text',
  '.md': 'text',
  '.markdown': 'text',
  '.log': 'text',
  '.rtf': 'text',

  // Image files
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.gif': 'image',
  '.svg': 'image',
  '.webp': 'image',
  '.bmp': 'image',
  '.ico': 'image',
  '.tiff': 'image',
  '.tif': 'image',

  // Video files
  '.mp4': 'video',
  '.avi': 'video',
  '.mov': 'video',
  '.mkv': 'video',
  '.wmv': 'video',
  '.flv': 'video',
  '.webm': 'video',
  '.m4v': 'video',

  // Audio files
  '.mp3': 'audio',
  '.wav': 'audio',
  '.flac': 'audio',
  '.aac': 'audio',
  '.ogg': 'audio',
  '.wma': 'audio',
  '.m4a': 'audio',

  // Archive files
  '.zip': 'archive',
  '.tar': 'archive',
  '.gz': 'archive',
  '.rar': 'archive',
  '.7z': 'archive',
  '.bz2': 'archive',
  '.xz': 'archive',
  '.tgz': 'archive',

  // Database files
  '.db': 'database',
  '.sqlite': 'database',
  '.sqlite3': 'database',
  '.sql': 'database',
  '.mdb': 'database',

  // Spreadsheet files
  '.xlsx': 'spreadsheet',
  '.xls': 'spreadsheet',
  '.csv': 'spreadsheet',
  '.ods': 'spreadsheet',
  '.tsv': 'spreadsheet',

  // JSON/Config files
  '.json': 'json',
  '.yaml': 'json',
  '.yml': 'json',
  '.toml': 'json',
  '.xml': 'json',
  '.ini': 'json',
  '.conf': 'json',
  '.config': 'json',

  // PDF files
  '.pdf': 'pdf',

  // Document files
  '.doc': 'document',
  '.docx': 'document',
  '.odt': 'document',
  '.ppt': 'document',
  '.pptx': 'document',
  '.odp': 'document',
}

// 图标类型到图标组件的映射
const iconComponents: Record<FileIconType, any> = {
  code: FileCode2,
  text: FileText,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  archive: FileArchive,
  database: Database,
  spreadsheet: FileSpreadsheet,
  json: FileJson,
  pdf: FileText,
  document: FileText,
  folder: Folder,
  file: File,
}

// 图标类型到颜色类的映射
const iconColors: Record<FileIconType, string> = {
  code: 'text-blue-500 dark:text-blue-400',
  text: 'text-gray-500 dark:text-gray-400',
  image: 'text-green-500 dark:text-green-400',
  video: 'text-purple-500 dark:text-purple-400',
  audio: 'text-pink-500 dark:text-pink-400',
  archive: 'text-yellow-500 dark:text-yellow-400',
  database: 'text-orange-500 dark:text-orange-400',
  spreadsheet: 'text-emerald-500 dark:text-emerald-400',
  json: 'text-cyan-500 dark:text-cyan-400',
  pdf: 'text-red-500 dark:text-red-400',
  document: 'text-blue-400 dark:text-blue-300',
  folder: 'text-primary',
  file: 'text-muted-foreground',
}

/**
 * 根据文件名和是否为目录获取对应的图标信息
 * @param fileName 文件名
 * @param isDirectory 是否为目录
 * @returns 包含图标组件、颜色类和类型的对象
 */
export function getFileIcon(fileName: string, isDirectory: boolean = false) {
  if (isDirectory) {
    return {
      Icon: Folder,
      color: iconColors.folder,
      type: 'folder' as FileIconType,
    }
  }

  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  const type = extensionMap[ext] || 'file'

  return {
    Icon: iconComponents[type],
    color: iconColors[type],
    type,
  }
}
