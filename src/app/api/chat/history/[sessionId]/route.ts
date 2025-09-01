import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { vectorRAGStore } from '@/lib/vector-rag'

// GET /api/chat/history/[sessionId] - Get messages for a specific session
export async function GET(
  request: NextRequest,
  {params}: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authResult = await auth()
    const userId = authResult?.userId
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { sessionId } = await params
    const messages = await vectorRAGStore.getSessionMessages(sessionId, userId)
    const session = await vectorRAGStore.getSession(sessionId, userId)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      session,
      messages
    })
  } catch (error) {
    console.error('Error fetching session messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/chat/history/[sessionId] - Delete a chat session
export async function DELETE(
  request: NextRequest,
  {params}: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authResult = await auth()
    const userId = authResult?.userId
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { sessionId } = await params
    await vectorRAGStore.deleteSession(sessionId, userId)
    
    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 