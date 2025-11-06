import { useState, useEffect, useRef } from 'react'
import { X, MessageSquare, Send, Minimize2, Maximize2 } from 'lucide-react'

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
        // Validate position is within reasonable bounds
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
    if (isOpen) return // Don't allow dragging when chat is open
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
      const buttonSize = 64 // 16 * 4 (w-16 h-16)

      // Calculate new position relative to viewport edges
      const newRight = viewportWidth - e.clientX - buttonSize / 2
      const newBottom = viewportHeight - e.clientY - buttonSize / 2

      // Clamp to viewport boundaries with comfortable padding
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
      // Call the real AI API
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth token if available
          // 'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: userInput,
          enableActions: true, // Enable AI to execute CRM actions
          context: {
            currentPage: currentPage,
            systemPrompt: `You are Albedo, a helpful AI assistant for ClientForge CRM. The user is currently on the ${currentPage} page. Be helpful, concise, and action-oriented.`
          }
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to get AI response')
      }

      // Format response based on type
      let content = data.data.message || data.data.content || 'I understand. How can I help further?'

      // If actions were executed, show them
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
        content: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const getContextualResponse = (question: string, page: string): string => {
    const lowerQ = question.toLowerCase()

    // Page-specific responses
    if (page === 'dashboard') {
      if (lowerQ.includes('metric') || lowerQ.includes('stats')) {
        return "Your dashboard shows key metrics: $2.4M revenue (↑12.5%), 47 active deals (↑8), 32% conversion rate (↑4.3%), and 12 tasks due today."
      }
      if (lowerQ.includes('do') || lowerQ.includes('help')) {
        return "On the dashboard, you can:\n• View key metrics and trends\n• See recent activity\n• Check upcoming tasks\n• Quick actions: Add contact or deal\n• Navigate to specific sections"
      }
    }

    if (page === 'contacts') {
      if (lowerQ.includes('add') || lowerQ.includes('create')) {
        return "To add a contact, click the '+ Add Contact' button in the top right. Fill in their details like name, email, company, and phone number."
      }
      if (lowerQ.includes('import')) {
        return "You can import contacts from CSV by clicking the 'Import' button. Make sure your CSV has columns for: firstName, lastName, email, company, phone."
      }
    }

    if (page === 'deals') {
      if (lowerQ.includes('stage') || lowerQ.includes('move')) {
        return "The deal pipeline has 6 stages: Lead → Qualified → Proposal → Negotiation → Closed Won → Closed Lost. Drag deals between columns to update their stage."
      }
      if (lowerQ.includes('kanban') || lowerQ.includes('view')) {
        return "You can switch between Kanban view (pipeline board) and List view using the toggle buttons. Kanban is great for visual pipeline management!"
      }
    }

    // General responses
    if (lowerQ.includes('hello') || lowerQ.includes('hi')) {
      return `Hi! I'm Albedo, your AI assistant. You're currently on the ${page} page. How can I help you?`
    }

    if (lowerQ.includes('navigate') || lowerQ.includes('go to')) {
      return "You can navigate using the sidebar:\n• Dashboard - Overview and metrics\n• Contacts - Manage people\n• Deals - Sales pipeline\n• Accounts - Companies\n• Tasks - To-do list"
    }

    // Default response
    return `I'm here to help you with ClientForge CRM! You're on the ${page} page. I can answer questions about features, help you navigate, or explain how to use specific tools. What would you like to know?`
  }

  const quickActions = [
    { label: '💡 What can I do here?', query: 'What can I do on this page?' },
    { label: '📊 Get dashboard stats', query: 'Get my dashboard statistics' },
    { label: '✅ Show upcoming tasks', query: 'Show my upcoming tasks for the next 7 days' },
    { label: '🔍 Search web', query: 'Search the web for information about CRM best practices' },
  ]

  return (
    <>
      {/* Floating Button - Draggable with logo */}
      {!isOpen && (
        <button
          ref={buttonRef}
          onMouseDown={handleMouseDown}
          onClick={(e) => {
            if (!isDragging) {
              setIsOpen(true)
            }
          }}
          className="fixed z-50 w-16 h-16 bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-950 hover:from-charcoal-900 hover:via-charcoal-800 hover:to-charcoal-900 rounded-full shadow-2xl hover:shadow-[0_0_40px_rgba(250,249,247,0.3)] transition-shadow duration-300 flex items-center justify-center group border-2 border-alabaster-300/40 relative overflow-hidden"
          style={{
            bottom: `${buttonPosition.bottom}px`,
            right: `${buttonPosition.right}px`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          {/* Subtle rotating shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-alabaster-200/10 to-transparent animate-shimmer rounded-full" style={{ backgroundSize: '200% 100%' }} />

          {/* Logo */}
          <img
            src="/logo.png"
            alt="Albedo AI"
            className="w-9 h-9 object-contain relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform"
          />
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-alabaster-200 to-alabaster-300 border-2 border-charcoal-900 rounded-full flex items-center justify-center text-[10px] text-charcoal-900 font-bold shadow-lg animate-pulse-slow">
            AI
          </span>
        </button>
      )}

      {/* Chat Window - Microsoft Copilot Style */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-white dark:bg-dark-secondary rounded-2xl flex flex-col transition-all ${
            isMinimized ? 'w-80 h-14' : 'w-[420px] h-[640px]'
          }`}
          style={{
            bottom: `${buttonPosition.bottom}px`,
            right: `${buttonPosition.right}px`,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)'
          }}
        >
          {/* Header - Premium Black Gradient (Copilot Style) */}
          <div className="relative bg-gradient-to-r from-charcoal-950 via-charcoal-900 to-charcoal-950 text-alabaster-50 px-5 py-4 rounded-t-2xl flex items-center justify-between overflow-hidden border-b border-alabaster-400/20"
            style={{
              boxShadow: '0 1px 0 0 rgba(250, 249, 247, 0.05) inset'
            }}
          >
            {/* Subtle gradient overlay (Copilot-style sophistication) */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-alabaster-200/5 to-transparent" />

            {/* Ambient light effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-alabaster-300/5 rounded-full blur-3xl" />

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-alabaster-100 to-alabaster-200 flex items-center justify-center shadow-lg border border-alabaster-300/40 p-1.5"
                style={{
                  boxShadow: '0 2px 8px rgba(250, 249, 247, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.5)'
                }}
              >
                <img
                  src="/logo.png"
                  alt="Albedo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="font-syne font-bold text-alabaster-50 text-base tracking-wide" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Albedo</h3>
                <p className="text-xs font-syne-mono text-alabaster-300/90">AI Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1 relative z-10">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-alabaster-100/10 rounded-md transition-all duration-150"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4 text-alabaster-100" /> : <Minimize2 className="w-4 h-4 text-alabaster-100" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-alabaster-100/10 rounded-md transition-all duration-150"
                title="Close"
              >
                <X className="w-4 h-4 text-alabaster-100" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          {!isMinimized && (
            <div className="flex-1 flex flex-col bg-alabaster-50/40 dark:bg-dark-tertiary/40 backdrop-blur-sm">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-charcoal-600 dark:text-charcoal-400 mt-12">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-alabaster-200 to-alabaster-300 dark:from-charcoal-800 dark:to-charcoal-700 flex items-center justify-center shadow-lg border border-alabaster-400/30 dark:border-charcoal-600/30 p-3">
                      <img
                        src="/logo.png"
                        alt="Albedo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h4 className="font-syne font-bold text-charcoal-900 dark:text-charcoal-50 mb-2 text-lg">Hi, I'm Albedo</h4>
                    <p className="text-sm font-syne-mono mb-10 text-charcoal-500 dark:text-charcoal-400 px-4">Your AI assistant for ClientForge CRM</p>

                    <div className="space-y-2.5 px-2">
                      {quickActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInput(action.query)
                            setTimeout(handleSend, 100)
                          }}
                          className="w-full text-left px-4 py-3.5 bg-white dark:bg-dark-secondary hover:bg-alabaster-100 dark:hover:bg-dark-hover rounded-lg text-sm font-syne-mono transition-all duration-150 border border-alabaster-600/30 dark:border-dark-border hover:border-alabaster-600/50 dark:hover:border-dark-border/70"
                          style={{
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          msg.role === 'user'
                            ? 'bg-charcoal-900 dark:bg-charcoal-700'
                            : 'bg-gradient-to-br from-alabaster-200 to-alabaster-300 dark:from-charcoal-800 dark:to-charcoal-700'
                        }`}
                        style={{
                          boxShadow: msg.role === 'user'
                            ? '0 1px 3px rgba(0, 0, 0, 0.2)'
                            : '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        <span className={`text-xs ${msg.role === 'user' ? 'text-alabaster-200' : 'text-charcoal-900 dark:text-alabaster-300'}`}>
                          {msg.role === 'user' ? '👤' : '🤖'}
                        </span>
                      </div>
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-charcoal-950 to-charcoal-900 dark:from-charcoal-900 dark:to-charcoal-800 text-alabaster-100 rounded-br-sm'
                            : 'bg-white dark:from-dark-secondary dark:to-dark-tertiary text-charcoal-900 dark:text-charcoal-50 rounded-bl-sm border border-alabaster-600/25 dark:border-dark-border'
                        }`}
                        style={{
                          boxShadow: msg.role === 'user'
                            ? '0 1px 2px rgba(0, 0, 0, 0.2)'
                            : '0 1px 3px rgba(0, 0, 0, 0.08)'
                        }}
                      >
                        <p className="text-sm font-syne-mono whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <span className="text-[10px] opacity-50 mt-1.5 block font-syne-mono">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-alabaster-200 to-alabaster-300 dark:from-charcoal-800 dark:to-charcoal-700 flex items-center justify-center flex-shrink-0"
                      style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}
                    >
                      <span className="text-xs text-charcoal-900 dark:text-alabaster-300">🤖</span>
                    </div>
                    <div className="bg-white dark:bg-dark-secondary rounded-2xl rounded-bl-sm px-4 py-3 border border-alabaster-600/25 dark:border-dark-border"
                      style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
                    >
                      <div className="flex gap-1.5">
                        <div className="w-1.5 h-1.5 bg-charcoal-500 dark:bg-charcoal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-charcoal-500 dark:bg-charcoal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-charcoal-500 dark:bg-charcoal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area (Copilot-style) */}
              <div className="border-t border-alabaster-600/30 dark:border-dark-border p-4 bg-white/80 dark:bg-dark-secondary/80 backdrop-blur-sm rounded-b-2xl">
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask Albedo anything..."
                    disabled={isLoading}
                    className="flex-1 px-4 py-2.5 border border-alabaster-600/40 dark:border-dark-border rounded-lg focus:outline-none focus:border-charcoal-900 dark:focus:border-charcoal-50 disabled:bg-alabaster-200 dark:disabled:bg-dark-tertiary bg-white dark:bg-dark-secondary text-charcoal-900 dark:text-charcoal-50 font-syne-mono text-sm transition-all duration-150"
                    style={{
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="px-4 py-2.5 bg-gradient-to-br from-charcoal-950 to-charcoal-900 dark:from-charcoal-900 dark:to-charcoal-800 text-alabaster-100 rounded-lg hover:from-charcoal-900 hover:to-charcoal-800 dark:hover:from-charcoal-800 dark:hover:to-charcoal-700 disabled:bg-alabaster-400 dark:disabled:bg-dark-tertiary disabled:cursor-not-allowed transition-all duration-150 disabled:opacity-50"
                    style={{
                      boxShadow: !isLoading && input.trim() ? '0 2px 6px rgba(0, 0, 0, 0.15)' : 'none'
                    }}
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
