'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser, UserButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Brain,
  MessageCircle,
  BookOpen,
  Home,
  Send,
  Volume2,
  VolumeX,
  Bot,
  User,
  Lightbulb,
  Target,
  Settings,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Globe,
  Mic,
  MicOff,
  Camera,
  Image,
  FileText,
  Zap,
  Menu,
  X,
  Plus,
  Trash2,
  History,
  Clock
} from 'lucide-react'
import { languages, getLanguageByCode } from '@/lib/utils'
import { vectorRAGStore, generateContextSummary } from '@/lib/vector-rag'
import { ChatSession, ChatMessage } from '@/lib/supabase'
import { LearningScene } from '@/components/LearningScene'

// Define viseme type
type Viseme = {
  start: number;
  end: number;
  value: string;
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  translation?: string
  timestamp: Date
  corrections?: string[]
  suggestions?: string[]
}

interface ConversationTopic {
  id: string
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  icon: any
  prompts: string[]
}

const conversationTopics: ConversationTopic[] = [
  {
    id: 'introductions',
    title: 'Introductions',
    description: 'Learn to introduce yourself and meet new people',
    difficulty: 'beginner',
    icon: User,
    prompts: [
      'Tell me about yourself',
      'What\'s your name and where are you from?',
      'What do you do for work or study?'
    ]
  },
  {
    id: 'restaurant',
    title: 'Restaurant',
    description: 'Practice ordering food and dining conversations',
    difficulty: 'intermediate',
    icon: Target,
    prompts: [
      'I\'d like to order something to eat',
      'Can you recommend a dish?',
      'Could I have the bill, please?'
    ]
  },
  {
    id: 'travel',
    title: 'Travel',
    description: 'Learn travel-related vocabulary and phrases',
    difficulty: 'intermediate',
    icon: Globe,
    prompts: [
      'I\'m looking for directions to...',
      'How much does a ticket cost?',
      'Where is the nearest hotel?'
    ]
  },
  {
    id: 'business',
    title: 'Business',
    description: 'Professional conversations and business etiquette',
    difficulty: 'advanced',
    icon: FileText,
    prompts: [
      'Let\'s discuss the project proposal',
      'I\'d like to schedule a meeting',
      'Can you explain the company policy?'
    ]
  }
]

export default function ChatPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [selectedLanguage, setSelectedLanguage] = useState('spanish')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<ConversationTopic | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [isListening, setIsListening] = useState(false)
  const [corrections, setCorrections] = useState<string[]>([])
  const [isVoiceMuted, setIsVoiceMuted] = useState(false)
  const [isTopicsMenuOpen, setIsTopicsMenuOpen] = useState(false)
  const [userLanguage, setUserLanguage] = useState('english')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // New state for 3D avatar and lip-syncing
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [currentVisemes, setCurrentVisemes] = useState<Viseme[] | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/')
    }
  }, [user, isLoaded, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (selectedTopic) {
      initializeConversation(selectedTopic)
    }
  }, [selectedTopic, selectedLanguage])

  // Load chat sessions on component mount
  useEffect(() => {
    if (user) {
      loadChatSessions()
    }
  }, [user])

  // Load preferences from localStorage
  useEffect(() => {
    const savedVoicePreference = localStorage.getItem('voiceMuted')
    if (savedVoicePreference !== null) {
      setIsVoiceMuted(JSON.parse(savedVoicePreference))
    }
    
    const savedLanguagePreference = localStorage.getItem('selectedLanguage')
    if (savedLanguagePreference) {
      setSelectedLanguage(savedLanguagePreference)
    }
    
    const savedUserLanguage = localStorage.getItem('userLanguage')
    if (savedUserLanguage) {
      setUserLanguage(savedUserLanguage)
    }
  }, [])

  // Save language preferences to localStorage
  useEffect(() => {
    localStorage.setItem('selectedLanguage', selectedLanguage)
  }, [selectedLanguage])

  useEffect(() => {
    localStorage.setItem('userLanguage', userLanguage)
  }, [userLanguage])

  const loadChatSessions = async () => {
    setIsLoadingSessions(true)
    try {
      const response = await fetch('/api/chat/history')
      if (response.ok) {
        const data = await response.json()
        setChatSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error)
    } finally {
      setIsLoadingSessions(false)
    }
  }

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/chat/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `${getLanguageByCode(selectedLanguage).name} Chat - ${new Date().toLocaleDateString()}`
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newSession = data.session
        setChatSessions(prev => [newSession, ...prev])
        setCurrentSessionId(newSession.id)
        setMessages([])
        setCorrections([])
      }
    } catch (error) {
      console.error('Error creating new session:', error)
    }
  }

  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/history/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        const sessionMessages = data.messages || []
        
        // Convert RAG messages to UI messages
        const uiMessages: Message[] = sessionMessages.map((msg: ChatMessage) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          translation: msg.metadata?.translation,
          timestamp: new Date(msg.created_at),
          corrections: [],
          suggestions: []
        }))
        
        setMessages(uiMessages)
        setCurrentSessionId(sessionId)
        setIsHistoryOpen(false)
      }
    } catch (error) {
      console.error('Error loading session:', error)
    }
  }

  const deleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/history/${sessionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setChatSessions(prev => prev.filter(session => session.id !== sessionId))
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null)
          setMessages([])
          setCorrections([])
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const initializeConversation = (topic: ConversationTopic) => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Hello! I'm your AI language tutor. Today we'll practice ${topic.title.toLowerCase()} in ${getLanguageByCode(selectedLanguage).name}. I'll speak with you in ${getLanguageByCode(selectedLanguage).name} and help you improve your skills. Let's start with: ${topic.prompts[0]}`,
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
    setCorrections([])
  }

  const sendMessage = async (message: string) => {
    if (!message.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          language: selectedLanguage,
          userLanguage: userLanguage,
          topic: selectedTopic?.id,
          level: selectedLevel,
          sessionId: currentSessionId || 'default'
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON')
      }

      const data = await response.json()
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'I received your message but couldn\'t generate a proper response.',
        translation: data.translation || undefined,
        timestamp: new Date(),
        corrections: Array.isArray(data.corrections) ? data.corrections : [],
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : []
      }

      setMessages(prev => [...prev, assistantMessage])
      setCorrections(Array.isArray(data.corrections) ? data.corrections : [])
      
      // Speak the AI response with lip-sync
      if (data.response && !isVoiceMuted) {
        setTimeout(() => {
          speakWithLipSync(data.response)
        }, 500) // Small delay to let UI update
      }
      
      // Reload sessions to update the session list
      loadChatSessions()
    } catch (error) {
      console.error('Error sending message:', error)
      
      let errorContent = 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.'
      
      if (error instanceof Error) {
        if (error.message.includes('Response is not JSON')) {
          errorContent = 'The server returned an unexpected response. Please check if the API is properly configured.'
        } else if (error.message.includes('HTTP error')) {
          errorContent = `Server error: ${error.message}. Please try again.`
        }
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Text-to-speech with lip-sync function
  const speakWithLipSync = async (text: string) => {
    try {
      setIsSpeaking(true)
      
      // Get viseme data from our API
      const visemeResponse = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      
      if (visemeResponse.ok) {
        const { visemes, duration, debug } = await visemeResponse.json()
        console.log('Received visemes:', visemes?.length, 'Duration:', duration)
        console.log('Debug info:', debug)
        setCurrentVisemes(visemes)
        
        // Use Web Speech API for actual speech synthesis
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text)
          
          // Configure speech settings
          utterance.rate = 0.9
          utterance.pitch = 1.0
          utterance.volume = 0.8
          
          // Try to use a female voice if available
          const voices = speechSynthesis.getVoices()
          const femaleVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('female') || 
            voice.name.toLowerCase().includes('zira') ||
            voice.name.toLowerCase().includes('aria')
          )
          if (femaleVoice) utterance.voice = femaleVoice
          
          // Create a fake audio element for timing sync
          const fakeAudio = new Audio()
          fakeAudio.currentTime = 0
          
          let startTime = Date.now()
          const updateCurrentTime = () => {
            if (isSpeaking) {
              fakeAudio.currentTime = (Date.now() - startTime) / 1000
              requestAnimationFrame(updateCurrentTime)
            }
          }
          
          utterance.onstart = () => {
            startTime = Date.now()
            setCurrentAudio(fakeAudio)
            updateCurrentTime()
          }
          
          utterance.onend = () => {
            setIsSpeaking(false)
            setCurrentAudio(null)
            setCurrentVisemes(null)
          }
          
          speechSynthesis.speak(utterance)
        }
      }
    } catch (error) {
      console.error('Error with text-to-speech:', error)
      setIsSpeaking(false)
    }
  }

  const toggleVoiceMute = () => {
    const newMutedState = !isVoiceMuted
    setIsVoiceMuted(newMutedState)
    localStorage.setItem('voiceMuted', JSON.stringify(newMutedState))
  }

  const startListening = () => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.lang = selectedLanguage === 'spanish' ? 'es-ES' : 
                        selectedLanguage === 'french' ? 'fr-FR' : 
                        selectedLanguage === 'german' ? 'de-DE' : 'en-US'
      recognition.continuous = false
      recognition.interimResults = false
      
      recognition.onstart = () => {
        setIsListening(true)
      }
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInputMessage(transcript)
        setIsListening(false)
      }
      
      recognition.onerror = () => {
        setIsListening(false)
      }
      
      recognition.onend = () => {
        setIsListening(false)
      }
      
      recognition.start()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const clearConversation = () => {
    setMessages([])
    setCorrections([])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputMessage)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#B9B38F'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading your AI chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#B9B38F'}}>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-sand-beige/20 sticky top-0 z-50 flex-shrink-0">
        <div className="w-full px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <img 
                  src="/logo.ico" 
                  alt="LyreBird Logo" 
                  className="w-10 h-10 rounded-full object-cover"
                />
                <span className="text-xl font-bold text-primary">LyreBird</span>
              </div>
              
              <nav className="hidden md:flex space-x-6">
                <Button variant="ghost" className="text-muted-foreground hover:text-primary" onClick={() => router.push('/dashboard')}>
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button variant="ghost" className="text-muted-foreground hover:text-primary" onClick={() => router.push('/events')}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Events
                </Button>
                <Button variant="ghost" className="text-primary hover:text-primary/80">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  AI Chat
                </Button>
              </nav>
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-4">
              <div className="hidden sm:flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Learning:</span>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-32 lg:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spanish">🇪🇸 Spanish</SelectItem>
                    <SelectItem value="french">🇫🇷 French</SelectItem>
                    <SelectItem value="german">🇩🇪 German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="hidden sm:flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Native:</span>
                <Select value={userLanguage} onValueChange={setUserLanguage}>
                  <SelectTrigger className="w-32 lg:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">🇺🇸 English</SelectItem>
                    <SelectItem value="spanish">🇪🇸 Spanish</SelectItem>
                    <SelectItem value="french">🇫🇷 French</SelectItem>
                    <SelectItem value="german">🇩🇪 German</SelectItem>
                    <SelectItem value="portuguese">🇵🇹 Portuguese</SelectItem>
                    <SelectItem value="italian">🇮🇹 Italian</SelectItem>
                    <SelectItem value="chinese">🇨🇳 Chinese</SelectItem>
                    <SelectItem value="japanese">🇯🇵 Japanese</SelectItem>
                    <SelectItem value="korean">🇰🇷 Korean</SelectItem>
                    <SelectItem value="arabic">🇸🇦 Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Mobile language selectors */}
              <div className="sm:hidden flex items-center space-x-1">
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spanish">🇪🇸</SelectItem>
                    <SelectItem value="french">🇫🇷</SelectItem>
                    <SelectItem value="german">🇩🇪</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={userLanguage} onValueChange={setUserLanguage}>
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">🇺🇸</SelectItem>
                    <SelectItem value="spanish">🇪🇸</SelectItem>
                    <SelectItem value="french">🇫🇷</SelectItem>
                    <SelectItem value="german">🇩🇪</SelectItem>
                    <SelectItem value="portuguese">🇵🇹</SelectItem>
                    <SelectItem value="italian">🇮🇹</SelectItem>
                    <SelectItem value="chinese">🇨🇳</SelectItem>
                    <SelectItem value="japanese">🇯🇵</SelectItem>
                    <SelectItem value="korean">🇰🇷</SelectItem>
                    <SelectItem value="arabic">🇸🇦</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <UserButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Screen */}
      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 w-full p-2">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 h-[calc(100vh-88px)]">
            {/* Chat History Sidebar */}
            <div className={`lg:col-span-1 ${isHistoryOpen ? 'block' : 'hidden lg:block'} h-full`}>
              <Card className="h-full flex flex-col shadow-lg">
                <CardHeader className="flex-shrink-0 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center">
                      <History className="w-5 h-5 mr-2" />
                      Chat History
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={createNewSession}
                      className="lg:hidden"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={createNewSession}
                    className="hidden lg:flex w-full justify-center"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat
                  </Button>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-y-auto p-0">
                  {isLoadingSessions ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : chatSessions.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No chat history yet</p>
                      <p className="text-xs">Start a conversation to see it here</p>
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {chatSessions.map((session) => (
                        <div
                          key={session.id}
                          className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                            currentSessionId === session.id
                              ? 'bg-primary/10 border border-primary/20'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => loadSession(session.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate">
                                {session.title}
                              </h4>
                              <div className="flex items-center text-xs text-muted-foreground mt-1">
                                <Clock className="w-3 h-3 mr-1" />
                                {new Date(session.updated_at).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {session.message_count} messages
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteSession(session.id)
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-3 h-full flex flex-col min-h-0">
              <Card className="h-full flex flex-col overflow-hidden shadow-lg">
                <CardHeader className="flex-shrink-0 border-b border-sand-beige/20 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* History Toggle for Mobile */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        className="lg:hidden p-2"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      
                      {/* Hamburger Menu for Topics */}
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsTopicsMenuOpen(!isTopicsMenuOpen)}
                          className="p-2"
                        >
                          {isTopicsMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                        </Button>
                        
                        {/* Topics Dropdown */}
                        {isTopicsMenuOpen && (
                          <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-sand-beige/20 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                            <div className="p-3 border-b border-sand-beige/20">
                              <h3 className="font-semibold text-sm">Conversation Topics</h3>
                              <p className="text-xs text-muted-foreground">Choose a topic to practice</p>
                            </div>
                            <div className="p-2 space-y-1">
                              {conversationTopics.map((topic) => (
                                <Button
                                  key={topic.id}
                                  variant={selectedTopic?.id === topic.id ? "default" : "ghost"}
                                  className="w-full justify-start h-auto p-3 text-left"
                                  onClick={() => {
                                    setSelectedTopic(topic)
                                    setIsTopicsMenuOpen(false)
                                    setMessages([])
                                    setCorrections([])
                                  }}
                                >
                                  <div className="flex items-start space-x-3 w-full">
                                    <topic.icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div className="text-left flex-1 min-w-0">
                                      <div className="font-medium text-sm">{topic.title}</div>
                                      <div className="text-xs opacity-80 mt-1 whitespace-normal break-words">{topic.description}</div>
                                      <Badge 
                                        variant={selectedTopic?.id === topic.id ? "secondary" : "outline"} 
                                        className="mt-2 text-xs"
                                      >
                                        {topic.difficulty}
                                      </Badge>
                                    </div>
                                  </div>
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Bot className="w-6 h-6 text-primary" />
                      <CardTitle className="text-xl">AI Language Tutor</CardTitle>
                      {selectedTopic && (
                        <Badge variant="outline" className="capitalize">
                          {selectedTopic.title}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="capitalize">
                        {getLanguageByCode(selectedLanguage).flag} {getLanguageByCode(selectedLanguage).name}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {selectedLevel}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                {/* Messages */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-6">
                      <div className="text-center max-w-md mx-auto">
                        <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                          Start Your Conversation
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Start chatting with your AI tutor or select a conversation topic from the menu for guided practice.
                        </p>
                        {!currentSessionId && (
                          <Button
                            onClick={createNewSession}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Start New Chat
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Messages Container */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <AnimatePresence>
                          {messages.map((message) => (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                                <div className={`flex items-start space-x-3 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    message.role === 'user' 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-secondary text-secondary-foreground'
                                  }`}>
                                    {message.role === 'user' ? (
                                      <User className="w-4 h-4" />
                                    ) : (
                                      <Bot className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className={`rounded-2xl px-4 py-3 ${
                                    message.role === 'user'
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-white border border-sand-beige/20 shadow-sm'
                                  }`}>
                                    <div className="text-sm whitespace-pre-wrap break-words">
                                      {message.content}
                                    </div>
                                    {/* Translation Display */}
                                    {message.translation && message.role === 'assistant' && (
                                      <div className="mt-2 pt-2 border-t border-sand-beige/20">
                                        <div className="text-xs text-muted-foreground mb-1">Translation:</div>
                                        <div className="text-sm text-muted-foreground italic">
                                          {message.translation}
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                      <span className="text-xs opacity-70">
                                        {message.timestamp.toLocaleTimeString()}
                                      </span>
                                      <div className="flex space-x-1">
                                        {message.role === 'assistant' && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => speakWithLipSync(message.content)}
                                            className={`h-6 w-6 p-0 ${isVoiceMuted ? 'opacity-50' : ''}`}
                                            title={isVoiceMuted ? 'Voice is muted' : 'Play message'}
                                          >
                                            {isVoiceMuted ? (
                                              <VolumeX className="w-3 h-3" />
                                            ) : (
                                              <Volume2 className="w-3 h-3" />
                                            )}
                                          </Button>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => copyToClipboard(message.content)}
                                          className="h-6 w-6 p-0"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        
                        {isLoading && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                                <Bot className="w-4 h-4" />
                              </div>
                              <div className="bg-white border border-sand-beige/20 rounded-2xl px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                  <span className="text-sm text-muted-foreground">AI is typing...</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>
                      
                      {/* Input Area */}
                      <div className="border-t border-sand-beige/20 p-4 flex-shrink-0">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 relative">
                            <input
                              ref={inputRef}
                              type="text"
                              value={inputMessage}
                              onChange={(e) => setInputMessage(e.target.value)}
                              onKeyPress={handleKeyPress}
                              placeholder={`Type your message in ${getLanguageByCode(selectedLanguage).name}...`}
                              className="w-full px-4 py-3 pr-12 rounded-2xl border border-sand-beige/20 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              disabled={isLoading}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                              onClick={startListening}
                              disabled={isListening}
                            >
                              {isListening ? (
                                <MicOff className="w-4 h-4 text-red-500" />
                              ) : (
                                <Mic className="w-4 h-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                          <Button
                            onClick={() => sendMessage(inputMessage)}
                            disabled={!inputMessage.trim() || isLoading}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {/* Quick Actions and Clear Chat Button */}
                        {selectedTopic ? (
                          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                            <div className="flex flex-wrap gap-1.5 flex-1">
                              {selectedTopic.prompts.map((prompt, index) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => sendMessage(prompt)}
                                  className="text-xs h-7 px-2 py-1 text-[10px] bg-custom-green text-white hover:bg-custom-green/90 border-custom-green"
                                >
                                  <Sparkles className="w-2.5 h-2.5 mr-1" />
                                  {prompt}
                                </Button>
                              ))}
                            </div>
                            
                            {/* Clear Chat Button - Same line, right side */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearConversation}
                              className="text-xs h-7 px-2 py-1 ml-2 flex-shrink-0 bg-custom-green text-white hover:bg-custom-green/90 border-custom-green"
                            >
                              <RefreshCw className="w-2.5 h-2.5 mr-1" />
                              Clear
                            </Button>
                          </div>
                        ) : (
                          messages.length > 0 && (
                            <div className="mt-3 flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={clearConversation}
                                className="text-xs h-7 px-2 py-1 bg-custom-green text-white hover:bg-custom-green/90 border-custom-green"
                              >
                                <RefreshCw className="w-2.5 h-2.5 mr-1" />
                                Clear
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Side - 3D Agent Model and Controls */}
            <div className="lg:col-span-1 space-y-2 h-full overflow-y-auto">
              {/* 3D Agent Model with Lip-Sync */}
              <Card className="h-[32rem] shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-center flex items-center justify-center gap-2">
                    <Brain className="w-4 h-4" />
                    AI Language Tutor
                    {isSpeaking && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600">Speaking</span>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-60px)] p-2">
                  <div className="w-full h-full rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50">
                    <LearningScene 
                      audio={currentAudio} 
                      visemes={currentVisemes}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Controls Below 3D Agent */}
              <div className="space-y-2">
                {/* Conversation Level */}
                <Card className="shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Conversation Level</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Select value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as 'beginner' | 'intermediate' | 'advanced')}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Mute Control */}
                <Card className="shadow-lg">
                  <CardContent className="p-3">
                    <Button 
                      variant={isSpeaking ? "destructive" : "outline"} 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        if (isSpeaking) {
                          speechSynthesis.cancel()
                          setIsSpeaking(false)
                          setCurrentAudio(null)
                          setCurrentVisemes(null)
                        }
                      }}
                    >
                      <Volume2 className="w-4 h-4 mr-2" />
                      {isSpeaking ? 'Stop Speaking' : 'Mute'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Corrections */}
                {corrections.length > 0 && (
                  <Card className="shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        Corrections
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1">
                        {corrections.map((correction, index) => (
                          <div key={index} className="text-xs bg-orange-50 border border-orange-200 rounded p-2">
                            {correction}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} style={{ display: 'none' }} crossOrigin="anonymous" />
    </div>
  )
} 