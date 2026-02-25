import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import './ChatFab.css'

interface ChatUser {
  id: string
  nome: string
  funcao: string | null
  is_profissional: boolean
}

interface ChatMessage {
  id: string
  de_usuario_id: string
  para_usuario_id: string
  mensagem: string
  created_at: string
  lida: boolean
}

const getDisplayName = (fullName: string) => {
  if (!fullName) return ''
  const parts = fullName.trim().split(' ').filter(Boolean)
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts[0]} ${parts[parts.length - 1]}`
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const formatChatDateLabel = (date: Date) => {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (isSameDay(date, today)) return 'Hoje'
  if (isSameDay(date, yesterday)) return 'Ontem'
  return date.toLocaleDateString('pt-BR')
}

const getUserRoleLabel = (user: ChatUser) => {
  if (user.is_profissional) return 'Profissional'

  switch (user.funcao) {
    case 'admin':
      return 'Administrador'
    case 'recepcao':
      return 'Recepção'
    case 'usuario':
      return 'Usuário comum'
    default:
      return 'Usuário'
  }
}

let sharedChatAudioContext: AudioContext | null = null

const getChatAudioContext = () => {
  try {
    const AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return null

    if (!sharedChatAudioContext) {
      sharedChatAudioContext = new AudioContext()
    }

    return sharedChatAudioContext
  } catch {
    return null
  }
}

const playNotificationSound = () => {
  try {
    const ctx = getChatAudioContext()
    if (!ctx) return

    const play = () => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.type = 'triangle'
      oscillator.frequency.value = 880
      gainNode.gain.value = 0.08

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      const now = ctx.currentTime
      oscillator.start(now)
      oscillator.stop(now + 0.18)
    }

    if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(() => {
          play()
        })
        .catch(() => {
          // Ignora falhas ao retomar contexto de áudio
        })
    } else {
      play()
    }
  } catch (err) {
    console.error('Erro ao tocar som de notificação do chat:', err)
  }
}

export function ChatFab() {
  const { usuario } = useAuth()
  const [open, setOpen] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [users, setUsers] = useState<ChatUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [unreadByUserId, setUnreadByUserId] = useState<Record<string, number>>({})
  const [toastInfo, setToastInfo] = useState<{ fromUserId: string; text: string } | null>(null)
  const [alertedMessageIds, setAlertedMessageIds] = useState<Record<string, boolean>>({})
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const originalTitleRef = useRef<string | null>(null)

  const currentUserId = usuario?.id

  const canUseChat = !!currentUserId

  const totalUnread = Object.values(unreadByUserId).reduce((acc, n) => acc + n, 0)
  const hasUnread = totalUnread > 0

  const selectedUser = useMemo(
    () => users.find(u => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  )

  useEffect(() => {
    if (typeof document === 'undefined') return

    const totalUnread = Object.values(unreadByUserId).reduce((acc, n) => acc + n, 0)

    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title
    }

    if (totalUnread > 0) {
      const base = originalTitleRef.current ?? document.title
      document.title = `(${totalUnread}) ${base}`
    } else if (originalTitleRef.current) {
      document.title = originalTitleRef.current
    }

    return () => {
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current
      }
    }
  }, [unreadByUserId])

  useEffect(() => {
    if (!toastInfo) return

    const timeoutId = window.setTimeout(() => {
      setToastInfo(null)
    }, 10000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toastInfo])

  const getUserNameById = (id: string | null | undefined) => {
    if (!id) return 'Contato'
    const user = users.find(u => u.id === id)
    return user ? getDisplayName(user.nome) : 'Contato'
  }

  useEffect(() => {
    if (!canUseChat || !open || !currentUserId) return

    const loadUsers = async () => {
      setLoadingUsers(true)
      try {
        const { data, error } = await supabase
          .from('usuarios_completo')
          .select('id, nome, funcao, is_profissional')
          .eq('ativo', true)
          .neq('id', currentUserId)
          .order('nome')

        if (error) throw error
        setUsers((data as ChatUser[]) ?? [])
      } catch (err) {
        console.error('Erro ao carregar usuários do chat:', err)
        setUsers([])
      } finally {
        setLoadingUsers(false)
      }
    }

    loadUsers()
  }, [canUseChat, open, currentUserId])

  useEffect(() => {
    if (!canUseChat || !open || !selectedUserId || !currentUserId) return

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_mensagens')
          .select('id, de_usuario_id, para_usuario_id, mensagem, created_at, lida')
          .or(
            `and(de_usuario_id.eq.${currentUserId},para_usuario_id.eq.${selectedUserId}),and(de_usuario_id.eq.${selectedUserId},para_usuario_id.eq.${currentUserId})`
          )
          .order('created_at', { ascending: true })

        if (error) throw error
        setMessages((data as ChatMessage[]) ?? [])
      } catch (err) {
        console.error('Erro ao carregar mensagens do chat:', err)
        setMessages([])
      }
    }

    loadMessages()
  }, [canUseChat, open, selectedUserId, currentUserId])

  useEffect(() => {
    if (!canUseChat || !currentUserId) return

    let cancelled = false

    const loadUnreadCounts = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_mensagens')
          .select('de_usuario_id')
          .eq('para_usuario_id', currentUserId)
          .eq('lida', false)

        if (error) throw error
        if (!data || cancelled) return

        const counts: Record<string, number> = {}
        ;(data as { de_usuario_id: string }[]).forEach(row => {
          const from = row.de_usuario_id
          counts[from] = (counts[from] ?? 0) + 1
        })

        setUnreadByUserId(counts)
      } catch (err) {
        console.error('Erro ao carregar mensagens não lidas:', err)
      }
    }

    loadUnreadCounts()

    const intervalId =
      typeof window !== 'undefined'
        ? window.setInterval(() => {
            if (!cancelled) {
              loadUnreadCounts()
            }
          }, 5000)
        : null

    return () => {
      cancelled = true
      if (intervalId !== null && typeof window !== 'undefined') {
        window.clearInterval(intervalId)
      }
    }
  }, [canUseChat, currentUserId])

  useEffect(() => {
    if (!open) return
    const container = messagesContainerRef.current
    if (!container) return

    container.scrollTop = container.scrollHeight
  }, [messages.length, selectedUserId, open])

  useEffect(() => {
    if (!canUseChat || !currentUserId) return

    const channel = supabase
      .channel('chat-mensagens-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_mensagens',
        },
        payload => {
          const newMsg = payload.new as ChatMessage

          const isToCurrentUser = newMsg.para_usuario_id === currentUserId
          const isFromCurrentUser = newMsg.de_usuario_id === currentUserId

          if (isToCurrentUser && !isFromCurrentUser) {
            playNotificationSound()
            setToastInfo({
              fromUserId: newMsg.de_usuario_id,
              text: newMsg.mensagem,
            })

            const isCurrentConversation =
              selectedUserId &&
              ((newMsg.de_usuario_id === currentUserId &&
                newMsg.para_usuario_id === selectedUserId) ||
                (newMsg.de_usuario_id === selectedUserId &&
                  newMsg.para_usuario_id === currentUserId))

            const canMarkAsUnread =
              !isCurrentConversation ||
              !open ||
              (typeof document !== 'undefined' && !document.hasFocus())

            if (canMarkAsUnread) {
              setUnreadByUserId(prev => {
                const fromId = newMsg.de_usuario_id
                const current = prev[fromId] ?? 0
                return { ...prev, [fromId]: current + 1 }
              })
            }
          }

          if (!selectedUserId) return

          const isCurrentConversation =
            (newMsg.de_usuario_id === currentUserId &&
              newMsg.para_usuario_id === selectedUserId) ||
            (newMsg.de_usuario_id === selectedUserId &&
              newMsg.para_usuario_id === currentUserId)

          if (!isCurrentConversation) return

          setMessages(prev => {
            if (prev.some(msg => msg.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [canUseChat, currentUserId, selectedUserId])

  const handleSend = async () => {
    if (!currentUserId || !selectedUserId || !newMessage.trim() || sending) return

    const text = newMessage.trim()
    setSending(true)
    try {
      const { data, error } = await supabase
        .from('chat_mensagens')
        .insert({
          de_usuario_id: currentUserId,
          para_usuario_id: selectedUserId,
          mensagem: text,
        })
        .select('id, de_usuario_id, para_usuario_id, mensagem, created_at, lida')
        .single()

      if (error) throw error
      if (data) {
        setMessages(prev => [...prev, data as ChatMessage])
      }
      setNewMessage('')
    } catch (err) {
      console.error('Erro ao enviar mensagem de chat:', err)
      // Mantém a mensagem no campo para o usuário tentar novamente
    } finally {
      setSending(false)
    }
  }

  const handleToggleAlertMessage = (messageId: string) => {
    setAlertedMessageIds(prev => ({
      ...prev,
      [messageId]: !prev[messageId],
    }))
    playNotificationSound()
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Deseja apagar esta mensagem do chat?')
      if (!confirmed) return
    }

    try {
      const { error } = await supabase.from('chat_mensagens').delete().eq('id', messageId)
      if (error) throw error
      setMessages(prev => prev.filter(msg => msg.id !== messageId))
      setAlertedMessageIds(prev => {
        const { [messageId]: _removed, ...rest } = prev
        return rest
      })
    } catch (err) {
      console.error('Erro ao apagar mensagem de chat:', err)
    }
  }

  const handleSelectUser = async (userId: string) => {
    setSelectedUserId(userId)
    setUnreadByUserId(prev => {
      const { [userId]: _removed, ...rest } = prev
      return rest
    })

    if (!currentUserId) return

    try {
      const { error } = await supabase
        .from('chat_mensagens')
        .update({ lida: true })
        .eq('de_usuario_id', userId)
        .eq('para_usuario_id', currentUserId)
        .eq('lida', false)

      if (error) throw error

      setMessages(prev =>
        prev.map(msg =>
          msg.de_usuario_id === userId && msg.para_usuario_id === currentUserId
            ? { ...msg, lida: true }
            : msg
        )
      )
    } catch (err) {
      console.error('Erro ao marcar mensagens como lidas:', err)
    }
  }

  if (!canUseChat) return null

  return (
    <>
      <button
        type="button"
        className={`chat-fab ${hasUnread ? 'has-unread' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label={hasUnread ? 'Chat interno - novas mensagens' : 'Chat interno'}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        {hasUnread && (
          <span className="chat-fab-unread-dot" aria-hidden="true">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {toastInfo && (
        <div
          className="chat-fab-toast"
          role="status"
          aria-live="polite"
          onClick={() => setToastInfo(null)}
        >
          <strong>Nova mensagem de {getUserNameById(toastInfo.fromUserId)}</strong>
          <span>{toastInfo.text}</span>
        </div>
      )}

      {open && (
        <div
          className="chat-fab-overlay"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="chat-fab-popup"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="chat-fab-header">
              <div className="chat-fab-title">
                <span>Comunicação interna</span>
                <small>Todos os usuários cadastrados</small>
              </div>
              <button
                type="button"
                className="chat-fab-close"
                onClick={() => setOpen(false)}
                aria-label="Fechar chat"
              >
                ×
              </button>
            </div>

            <div className="chat-fab-body">
              <div className="chat-fab-users">
                <div className="chat-fab-users-header">
                  <span>Contatos</span>
                </div>
                {loadingUsers ? (
                  <div className="chat-fab-users-empty">Carregando...</div>
                ) : users.length === 0 ? (
                  <div className="chat-fab-users-empty">Nenhum contato disponível.</div>
                ) : (
                  <ul>
                    {users.map(u => {
                      const unreadCount = unreadByUserId[u.id] ?? 0

                      return (
                        <li key={u.id}>
                          <button
                            type="button"
                            className={`chat-fab-user-btn ${selectedUserId === u.id ? 'active' : ''} ${
                              unreadCount > 0 ? 'has-unread' : ''
                            }`}
                            onClick={() => {
                              handleSelectUser(u.id)
                            }}
                          >
                            <div className="chat-fab-user-avatar">
                              {u.nome.charAt(0).toUpperCase()}
                            </div>
                            <div className="chat-fab-user-info">
                              <span className="name">{getDisplayName(u.nome)}</span>
                              <span className="role">{getUserRoleLabel(u)}</span>
                            </div>
                            {unreadCount > 0 && (
                              <span className="chat-fab-user-unread-badge">
                                {unreadCount > 9 ? '9+' : unreadCount}
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="chat-fab-conversation">
                {selectedUser ? (
                  <>
                    <div className="chat-fab-conversation-header">
                      <div className="chat-fab-user-avatar">
                        {selectedUser.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="chat-fab-user-info">
                        <span className="name">{getDisplayName(selectedUser.nome)}</span>
                        <span className="role">{getUserRoleLabel(selectedUser)}</span>
                      </div>
                    </div>
                    <div className="chat-fab-messages" ref={messagesContainerRef}>
                      {messages.length === 0 ? (
                        <div className="chat-fab-messages-empty">
                          Comece uma nova conversa com {getDisplayName(selectedUser.nome)}.
                        </div>
                      ) : (
                        messages.map((msg, index) => {
                          const isMine = msg.de_usuario_id === currentUserId
                          const messageDate = new Date(msg.created_at)
                          const previous = messages[index - 1]
                          const previousDate = previous ? new Date(previous.created_at) : null
                          const showDateDivider =
                            index === 0 || (previousDate && !isSameDay(previousDate, messageDate))

                          return (
                            <Fragment key={msg.id}>
                              {showDateDivider && (
                                <div className="chat-fab-date-divider">
                                  <span>{formatChatDateLabel(messageDate)}</span>
                                </div>
                              )}
                              <div className={`chat-fab-message ${isMine ? 'mine' : 'theirs'}`}>
                                <div className={`bubble ${alertedMessageIds[msg.id] ? 'alert' : ''}`}>
                                  <p>{msg.mensagem}</p>
                                  <span className="time">
                                    {messageDate.toLocaleTimeString('pt-BR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <div className="chat-fab-message-actions">
                                    <button
                                      type="button"
                                      className={`action-btn alert-btn ${alertedMessageIds[msg.id] ? 'active' : ''}`}
                                      onClick={() => handleToggleAlertMessage(msg.id)}
                                    >
                                      Alerta
                                    </button>
                                    <button
                                      type="button"
                                      className="action-btn delete-btn"
                                      onClick={() => handleDeleteMessage(msg.id)}
                                    >
                                      Apagar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </Fragment>
                          )
                        })
                      )}
                    </div>
                    <div className="chat-fab-input">
                      <textarea
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        rows={2}
                        placeholder="Digite sua mensagem..."
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend()
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending || !newMessage.trim()}
                      >
                        Enviar
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="chat-fab-conversation-empty">
                    Selecione um contato para começar a conversar.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

