interface MarkdownNode {
  type: string
  url?: string
  value?: string
  children?: MarkdownNode[]
}

// GFM's literal autolink parser accepts Unicode in a URL. In Chinese prose that
// means a full-width sentence delimiter can accidentally pull the whole suffix
// into a bare link, e.g. `http://host:9999）的验证结果`. Explicit Markdown links
// are left alone; this only repairs literal links whose visible text equals the
// generated destination.
const CJK_LINK_BOUNDARY = /[，。；：！？）】》」』]/u
const HTTP_URL = /^https?:\/\/\S+$/iu

export function remarkCjkAutolinkBoundary() {
  return (tree: MarkdownNode) => repairAutolinks(tree)
}

function repairAutolinks(parent: MarkdownNode): void {
  if (!parent.children) return

  for (let index = 0; index < parent.children.length; index += 1) {
    const node = parent.children[index]
    const suffix = trimLiteralAutolink(node)
    if (suffix) {
      parent.children.splice(index + 1, 0, { type: 'text', value: suffix })
    }
    repairAutolinks(node)
  }
}

function trimLiteralAutolink(node: MarkdownNode): string {
  if (node.type !== 'link' || !node.url || node.children?.length !== 1) return ''
  const text = node.children[0]
  if (text.type !== 'text' || !text.value || text.value !== node.url) return ''

  const boundary = CJK_LINK_BOUNDARY.exec(text.value)
  if (!boundary || boundary.index <= 0) return ''

  const url = text.value.slice(0, boundary.index)
  if (!HTTP_URL.test(url)) return ''

  const suffix = text.value.slice(boundary.index)
  node.url = url
  text.value = url
  return suffix
}
