import { Fragment, useEffect, useMemo, useState } from 'react'
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

const playNotificationSound = () => {
  try {
    const AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return

    const ctx = new AudioContext()
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

  const currentUserId = usuario?.id

  const isRecepcao = usuario?.funcao === 'recepcao'
  const isProfissional = usuario?.is_profissional

  const canUseChat = !!currentUserId

  const selectedUser = useMemo(
    () => users.find(u => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  )

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
          .select('id, de_usuario_id, para_usuario_id, mensagem, created_at')
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
        .select('id, de_usuario_id, para_usuario_id, mensagem, created_at')
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

  if (!canUseChat) return null

  return (
    <>
      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen(v => !v)}
        aria-label="Chat entre recepção e profissional"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </button>

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
                    {users.map(u => (
                      <li key={u.id}>
                        <button
                          type="button"
                          className={`chat-fab-user-btn ${selectedUserId === u.id ? 'active' : ''}`}
                          onClick={() => setSelectedUserId(u.id)}
                        >
                          <div className="chat-fab-user-avatar">
                            {u.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="chat-fab-user-info">
                            <span className="name">{getDisplayName(u.nome)}</span>
                            <span className="role">{getUserRoleLabel(u)}</span>
                          </div>
                        </button>
                      </li>
                    ))}
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
                    <div className="chat-fab-messages">
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
                                <div className="bubble">
                                  <p>{msg.mensagem}</p>
                                  <span className="time">
                                    {messageDate.toLocaleTimeString('pt-BR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
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

