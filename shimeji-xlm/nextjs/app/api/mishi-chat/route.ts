import { NextRequest, NextResponse } from "next/server";

// Simple in-memory message queue for polling fallback
// In production, this should use Redis or a database
const messageQueues: Map<string, Array<{id: string; content: string; timestamp: number}>> = new Map();
const MAX_QUEUE_SIZE = 100;
const MAX_MESSAGE_AGE_MS = 5 * 60 * 1000; // 5 minutes

function getQueue(agentId: string): Array<{id: string; content: string; timestamp: number}> {
  if (!messageQueues.has(agentId)) {
    messageQueues.set(agentId, []);
  }
  return messageQueues.get(agentId)!;
}

function cleanupOldMessages(queue: Array<{id: string; content: string; timestamp: number}>) {
  const now = Date.now();
  return queue.filter(msg => now - msg.timestamp < MAX_MESSAGE_AGE_MS);
}

// POST - Add a message to an agent's queue (called by OpenClaw)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { agentId, content } = body;

    if (!agentId || typeof content !== 'string') {
      return NextResponse.json({ error: "Missing agentId or content" }, { status: 400 });
    }

    const queue = getQueue(agentId);
    const newMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      timestamp: Date.now()
    };

    queue.push(newMessage);

    // Keep queue size manageable
    if (queue.length > MAX_QUEUE_SIZE) {
      queue.shift();
    }

    return NextResponse.json({ success: true, messageId: newMessage.id });
  } catch (error) {
    console.error("Error in mishi-chat POST:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET - Poll for messages (called by Shimeji clients)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const lastMessageId = searchParams.get("lastMessageId") || "";

    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
    }

    const queue = getQueue(agentId);
    const cleanedQueue = cleanupOldMessages(queue);
    messageQueues.set(agentId, cleanedQueue);

    // Find messages after lastMessageId
    let foundLastId = !lastMessageId;
    const newMessages = [];

    for (const msg of cleanedQueue) {
      if (foundLastId) {
        newMessages.push(msg);
      }
      if (msg.id === lastMessageId) {
        foundLastId = true;
      }
    }

    // If no lastMessageId provided, return all messages
    if (!lastMessageId && cleanedQueue.length > 0) {
      newMessages.push(...cleanedQueue);
    }

    return NextResponse.json({
      messages: newMessages,
      hasMore: false // For now, simple implementation
    });
  } catch (error) {
    console.error("Error in mishi-chat GET:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE - Acknowledge/remove processed messages
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { agentId, messageIds } = body;

    if (!agentId || !Array.isArray(messageIds)) {
      return NextResponse.json({ error: "Missing agentId or messageIds" }, { status: 400 });
    }

    const queue = getQueue(agentId);
    const idSet = new Set(messageIds);
    const filteredQueue = queue.filter(msg => !idSet.has(msg.id));
    messageQueues.set(agentId, filteredQueue);

    return NextResponse.json({ success: true, removed: queue.length - filteredQueue.length });
  } catch (error) {
    console.error("Error in mishi-chat DELETE:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
