import { dateValue, messageRefIds } from './helpers'

export interface ThreadableMessage {
  id: string
  refs?: { messages?: string[] }
  created_at?: string
}

export interface ThreadGroup<M extends ThreadableMessage> {
  root: M
  messages: M[]
}

export function groupIntoThreads<M extends ThreadableMessage>(messages: M[]): ThreadGroup<M>[] {
  if (messages.length === 0) return []

  const byId = new Map(messages.map(m => [m.id, m]))
  const childrenByParent = new Map<string, M[]>()
  const roots: M[] = []

  for (const m of messages) {
    const parents = messageRefIds(m).filter(refId => refId !== m.id && byId.has(refId))
    if (parents.length === 0) roots.push(m)
    for (const parentId of parents) {
      const children = childrenByParent.get(parentId)
      if (children) children.push(m)
      else childrenByParent.set(parentId, [m])
    }
  }

  const assigned = new Set<string>()
  const groups: ThreadGroup<M>[] = []

  const pushGroup = (root: M) => {
    const collected = collectDescendants(root, childrenByParent)
    for (const m of collected) assigned.add(m.id)
    groups.push({ root, messages: collected })
  }

  for (const root of roots) pushGroup(root)
  for (const m of messages) {
    if (!assigned.has(m.id)) pushGroup(m)
  }

  return groups
}

function collectDescendants<M extends ThreadableMessage>(
  root: M,
  childrenByParent: Map<string, M[]>,
): M[] {
  const collected = new Map<string, M>()
  const stack: M[] = [root]

  while (stack.length > 0) {
    const message = stack.pop()!
    if (collected.has(message.id)) continue
    collected.set(message.id, message)
    for (const child of childrenByParent.get(message.id) ?? []) {
      if (!collected.has(child.id)) stack.push(child)
    }
  }

  return [...collected.values()].sort((a, b) => {
    if (a.id === root.id) return -1
    if (b.id === root.id) return 1
    return dateValue(a.created_at) - dateValue(b.created_at)
  })
}
