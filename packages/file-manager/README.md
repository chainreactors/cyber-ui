# @cyber/file-manager

IoM 文件管理器的共享 cyber-ui 版本。核心状态、目录树、列表/网格、批量操作、拖拽上传、进度、属性和权限交互均直接迁自 IoM，数据访问通过 `FileManagerAdapter` 注入。

额外提供：

- 文件与目录空白区域右键菜单
- 路径输入快速跳转
- `historyKey` 隔离并持久化的近期路径历史
- Windows / UNC / POSIX 路径处理
- 根据 adapter 能力隐藏不支持的操作

```tsx
import { FileManager, type FileManagerAdapter } from '@cyber/file-manager'

const adapter: FileManagerAdapter = {
  list: (path) => api.list(path),
  mkdir: (path) => api.mkdir(path),
  upload: (file, targetPath) => api.upload(file, targetPath),
}

<FileManager
  adapter={adapter}
  initialPath="/tmp"
  sourceKey="session-1"
  historyKey="session-1-files"
/>
```
