import { useState, useEffect, useRef } from 'react'
import { X, MessageSquare, Send, Minimize2, Maximize2, Sparkles, Zap, TrendingUp, Users } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AlbedoChatProps {
  currentPage?: string
}

export default function AlbedoChat({ currentPage = 'dashboard' }: AlbedoChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Draggable button position
  const [buttonPosition, setButtonPosition] = useState(() => {
    const saved = localStorage.getItem('albedo-button-position')
    if (saved) {
      try {
        const position = JSON.parse(saved)
        if (position.bottom >= 0 && position.bottom < 2000 &&
            position.right >= 0 && position.right < 2000) {
          return position
        }
      } catch (e) {
        // Invalid saved position, use default
      }
    }
    return { bottom: 32, right: 32 }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle button drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isOpen) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX - (buttonRef.current?.offsetLeft || 0),
      y: e.clientY - (buttonRef.current?.offsetTop || 0)
    })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const buttonSize = 64

      const newRight = viewportWidth - e.clientX - buttonSize / 2
      const newBottom = viewportHeight - e.clientY - buttonSize / 2

      const clampedRight = Math.max(16, Math.min(viewportWidth - buttonSize - 16, newRight))
      const clampedBottom = Math.max(16, Math.min(viewportHeight - buttonSize - 16, newBottom))

      setButtonPosition({
        bottom: clampedBottom,
        right: clampedRight
      })
    }

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        localStorage.setItem('albedo-button-position', JSON.stringify(buttonPosition))
      }
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, buttonPosition])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    const userInput = input
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          message: userInput,
          enableActions: true,
          context: {
            currentPage: currentPage,
            systemPrompt: `You are Albedo, an intelligent AI assistant for ClientForge CRM. The user is currently on the ${currentPage} page. Be helpful, insightful, and action-oriented. Provide clear, concise answers and suggest actionable next steps.`
          }
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to get AI response')
      }

      let content = data.data.message || data.data.content || 'I understand. How can I help further?'

      if (data.data.type === 'action' && data.data.actions && data.data.actions.length > 0) {
        const actionsText = data.data.actions.map((action: any) => {
          if (action.success) {
            return `✅ ${action.tool.replace(/_/g, ' ')}: ${action.result.message || 'Success'}`
          } else {
            return `❌ ${action.tool.replace(/_/g, ' ')}: ${action.error || 'Failed'}`
          }
        }).join('\n')

        content = `${content}\n\n**Actions Executed:**\n${actionsText}`
      }

      const aiMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: content,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error: any) {
      console.error('Albedo chat error:', error)
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error.message}. Please try again or contact support if the issue persists.`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions = [
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: 'Show me key metrics',
      query: 'What are my key performance metrics and trends?'
    },
    {
      icon: <Users className="w-4 h-4" />,
      label: 'Top contacts this week',
      query: 'Show me the most engaged contacts from this week'
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      label: 'Get AI insights',
      query: 'Give me AI-powered insights about my sales pipeline'
    },
    {
      icon: <Zap className="w-4 h-4" />,
      label: 'Quick actions',
      query: 'What quick actions can I take right now to boost productivity?'
    },
  ]

  return (
    <>
      {/* Enterprise Floating Button */}
      {!isOpen && (
        <button
          ref={buttonRef}
          onMouseDown={handleMouseDown}
          onClick={(e) => {
            if (!isDragging) {
              setIsOpen(true)
            }
          }}
          className="fixed z-50 w-16 h-16 rounded-2xl shadow-2xl transition-all duration-300 flex items-center justify-center group overflow-hidden"
          style={{
            bottom: `${buttonPosition.bottom}px`,
            right: `${buttonPosition.right}px`,
            cursor: isDragging ? 'grabbing' : 'grab',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Animated gradient border */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(135deg, #faf9f7 0%, #e8e6e3 50%, #faf9f7 100%)',
              padding: '2px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude'
            }}
          />

          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

          {/* Logo container with glow */}
          <div className="relative z-10 w-10 h-10 rounded-xl bg-gradient-to-br from-alabaster-100 to-alabaster-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
            style={{
              boxShadow: '0 4px 12px rgba(250, 249, 247, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.8)'
            }}
          >
            <MessageSquare className="w-6 h-6 text-charcoal-900" />
          </div>

          {/* AI Badge */}
          <div className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-charcoal-900 rounded-full flex items-center justify-center shadow-lg"
            style={{
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        </button>
      )}

      {/* Premium Chat Window */}
      {isOpen && (
        <div
          className={`fixed z-50 flex flex-col transition-all duration-300 ${
            isMinimized ? 'w-96 h-16' : 'w-[480px] h-[700px]'
          }`}
          style={{
            bottom: `${buttonPosition.bottom}px`,
            right: `${buttonPosition.right}px`,
            background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), 0 8px 24px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.08)',
            backdropFilter: 'blur(20px)'
          }}
        >
          {/* Premium Header */}
          <div className="relative px-6 py-5 rounded-t-3xl flex items-center justify-between overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
              borderBottom: '1px solid rgba(250, 249, 247, 0.1)'
            }}
          >
            {/* Ambient glow effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full blur-3xl" />

            <div className="flex items-center gap-4 relative z-10">
              {/* Avatar with animated border */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl animate-spin-slow"
                  style={{ padding: '2px' }}
                />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-alabaster-100 to-alabaster-200 flex items-center justify-center"
                  style={{
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.8)'
                  }}
                >
                  <MessageSquare className="w-6 h-6 text-charcoal-900" />
                </div>
              </div>

              <div>
                <h3 className="font-syne font-bold text-alabaster-50 text-lg tracking-tight flex items-center gap-2">
                  Albedo
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </h3>
                <p className="text-xs font-syne-mono text-alabaster-300/80 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  AI Assistant • Online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 relative z-10">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 group"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ?
                  <Maximize2 className="w-5 h-5 text-alabaster-200 group-hover:text-white transition-colors" /> :
                  <Minimize2 className="w-5 h-5 text-alabaster-200 group-hover:text-white transition-colors" />
                }
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 group"
                title="Close"
              >
                <X className="w-5 h-5 text-alabaster-200 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          {!isMinimized && (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: 'linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)' }}>
                {messages.length === 0 ? (
                  <div className="text-center mt-16">
                    {/* Welcome Avatar */}
                    <div className="relative w-24 h-24 mx-auto mb-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/30 to-teal-500/30 rounded-3xl animate-pulse" />
                      <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-alabaster-100 to-alabaster-200 flex items-center justify-center"
                        style={{
                          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.9)'
                        }}
                      >
                        <MessageSquare className="w-12 h-12 text-charcoal-900" />
                      </div>
                    </div>

                    <h4 className="font-syne font-bold text-charcoal-900 mb-2 text-2xl">Welcome to Albedo</h4>
                    <p className="text-sm font-syne-mono mb-3 text-charcoal-600 max-w-sm mx-auto">
                      Your intelligent AI assistant for ClientForge CRM
                    </p>
                    <p className="text-xs font-syne-mono text-charcoal-500 mb-12 px-8">
                      Ask me anything about your CRM data, get insights, or let me help you take action
                    </p>

                    {/* Quick Actions Grid */}
                    <div className="grid grid-cols-2 gap-3 px-4">
                      {quickActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInput(action.query)
                            setTimeout(handleSend, 100)
                          }}
                          className="group relative text-left px-5 py-4 bg-white hover:bg-alabaster-50 rounded-2xl transition-all duration-200 border border-charcoal-200/40 hover:border-emerald-400/50 overflow-hidden"
                          style={{
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                          }}
                        >
                          {/* Hover gradient */}
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/0 to-teal-500/0 group-hover:from-emerald-400/5 group-hover:to-teal-500/5 transition-all duration-200" />

                          <div className="relative">
                            <div className="w-9 h-9 mb-3 rounded-xl bg-gradient-to-br from-charcoal-900 to-charcoal-800 flex items-center justify-center text-alabaster-100 group-hover:scale-110 transition-transform duration-200"
                              style={{
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                              }}
                            >
                              {action.icon}
                            </div>
                            <p className="text-sm font-syne-mono text-charcoal-800 font-medium leading-snug">
                              {action.label}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex gap-3.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-charcoal-900 to-charcoal-800'
                            : 'bg-gradient-to-br from-alabaster-100 to-alabaster-200'
                        }`}
                        style={{
                          boxShadow: msg.role === 'user'
                            ? '0 2px 8px rgba(0, 0, 0, 0.25)'
                            : '0 2px 8px rgba(16, 185, 129, 0.15)'
                        }}
                      >
                        {msg.role === 'user' ? (
                          <span className="text-sm text-alabaster-200">👤</span>
                        ) : (
                          <MessageSquare className="w-5 h-5 text-charcoal-900" />
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`max-w-[75%] rounded-2xl px-5 py-3.5 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-charcoal-900 to-charcoal-800 text-alabaster-100 rounded-tr-md'
                            : 'bg-white text-charcoal-900 rounded-tl-md border border-charcoal-200/30'
                        }`}
                        style={{
                          boxShadow: msg.role === 'user'
                            ? '0 2px 12px rgba(0, 0, 0, 0.15)'
                            : '0 2px 12px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.02)'
                        }}
                      >
                        <p className="text-sm font-syne-mono whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </p>
                        <span className="text-xs opacity-60 mt-2 block font-syne-mono">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}

                {/* Typing Indicator */}
                {isLoading && (
                  <div className="flex gap-3.5 animate-fade-in">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-alabaster-100 to-alabaster-200 flex items-center justify-center flex-shrink-0"
                      style={{ boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)' }}
                    >
                      <MessageSquare className="w-5 h-5 text-charcoal-900" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-md px-5 py-4 border border-charcoal-200/30"
                      style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)' }}
                    >
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-charcoal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-charcoal-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                        <div className="w-2 h-2 bg-charcoal-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Premium Input Area */}
              <div className="p-5 bg-white border-t border-charcoal-200/30 rounded-b-3xl">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      placeholder="Ask Albedo anything..."
                      disabled={isLoading}
                      className="w-full px-5 py-3.5 pr-12 border-2 border-charcoal-200/40 focus:border-emerald-400 rounded-2xl focus:outline-none disabled:bg-alabaster-200/50 bg-white text-charcoal-900 font-syne-mono text-sm placeholder:text-charcoal-400 transition-all duration-200"
                      style={{
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                      }}
                    />
                    {input.length > 0 && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-syne-mono text-charcoal-400">
                        {input.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="px-5 py-3.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-700 disabled:from-charcoal-300 disabled:to-charcoal-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 group"
                    style={{
                      boxShadow: !isLoading && input.trim()
                        ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                        : 'none'
                    }}
                  >
                    <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
                <p className="text-xs font-syne-mono text-charcoal-500 mt-3 text-center">
                  Albedo can make mistakes. Verify important information.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}</style>
    </>
  )
}
