import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as HandleUploadBody
  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, _clientPayload) => {
        return {
          allowedContentTypes: [
            // audio
            'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/x-wav',
            'audio/ogg', 'audio/webm', 'audio/x-m4a', 'audio/m4a',
            'audio/aac', 'audio/x-aac', 'audio/flac', 'audio/x-flac',
            'audio/3gpp', 'audio/amr', 'audio/x-ms-wma',
            // video
            'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg',
            // document
            'application/pdf',
            'text/plain',
            'application/octet-stream',
          ],
          maximumSizeInBytes: 500 * 1024 * 1024,
          tokenPayload: JSON.stringify({ userId: session.userId }),
        }
      },
      onUploadCompleted: async () => {
        // metadata is saved separately via POST /api/knowledge
      },
    })
    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
