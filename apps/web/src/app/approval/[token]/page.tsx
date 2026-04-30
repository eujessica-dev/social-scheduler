'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  CheckCircle2, XCircle, MessageSquare, Send, Loader2,
  Clock, AlertTriangle, Image as ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface MediaAsset { id: string; mimeType: string; url: string; filename: string }
interface Comment { id: string; authorName: string; text: string; isInternal: boolean; createdAt: string }
interface Approval {
  id: string
  token: string
  clientName: string | null
  clientEmail: string | null
  expiresAt: string
  approvedAt: string | null
  rejectedAt: string | null
  feedback: string | null
  comments: Comment[]
  creative: {
    id: string
    title: string | null
    caption: string | null
    hashtags: string[]
    status: string
    media: { id: string; order: number; mediaAsset: MediaAsset }[]
    brand: { id: string; name: string }
  }
}

async function publicFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message ?? 'Erro ao carregar')
  }
  return res.json()
}

export default function ApprovalPage() {
  const { token } = useParams<{ token: string }>()

  const [approval, setApproval] = useState<Approval | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeThumb, setActiveThumb] = useState(0)
  const [comment, setComment] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null)
  const [feedback, setFeedback] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)
  const [comments, setComments] = useState<Comment[]>([])

  const load = async () => {
    try {
      const data = await publicFetch(`/approvals/${token}`)
      setApproval(data)
      setComments(data.comments ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token])

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim() || !authorName.trim()) return
    setCommentLoading(true)
    setCommentError('')
    try {
      const c = await publicFetch(`/approvals/${token}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: comment, authorName }),
      })
      setComments((prev) => [...prev, c])
      setComment('')
    } catch (err: any) {
      setCommentError(err.message)
    } finally {
      setCommentLoading(false)
    }
  }

  const handleApprove = async () => {
    setActionLoading('approve')
    try {
      await publicFetch(`/approvals/${token}/approve`, {
        method: 'POST',
        body: JSON.stringify({ clientName: authorName || undefined }),
      })
      setDone('approved')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading('reject')
    try {
      await publicFetch(`/approvals/${token}/reject`, {
        method: 'POST',
        body: JSON.stringify({ feedback, clientName: authorName || undefined }),
      })
      setDone('rejected')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ─── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm text-center shadow-sm">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="font-semibold text-gray-900 text-lg mb-2">Link inválido</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  // ─── Done ───────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm text-center shadow-sm">
          {done === 'approved' ? (
            <>
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
              <h1 className="font-bold text-gray-900 text-xl mb-2">Criativo aprovado!</h1>
              <p className="text-sm text-gray-500">Obrigado pela avaliação. O criativo foi aprovado com sucesso.</p>
            </>
          ) : (
            <>
              <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
              <h1 className="font-bold text-gray-900 text-xl mb-2">Criativo rejeitado</h1>
              <p className="text-sm text-gray-500">Seu feedback foi registrado. A equipe será notificada.</p>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!approval) return null

  const creative = approval.creative
  const media = creative.media.sort((a, b) => a.order - b.order)
  const activeMedia = media[activeThumb]?.mediaAsset
  const alreadyActioned = !!approval.approvedAt || !!approval.rejectedAt
  const expires = new Date(approval.expiresAt)
  const daysLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="text-xs text-gray-400">Aprovação de criativo</p>
          <h1 className="font-semibold text-gray-900 text-sm">
            {creative.brand.name} — {creative.title ?? 'Sem título'}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          {daysLeft > 0 ? `Expira em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}` : 'Expirado'}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Status atual */}
        {alreadyActioned && (
          <div className={cn(
            'rounded-xl p-4 flex items-center gap-3',
            approval.approvedAt ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100',
          )}>
            {approval.approvedAt
              ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            }
            <div>
              <p className={cn('text-sm font-medium', approval.approvedAt ? 'text-green-800' : 'text-red-800')}>
                {approval.approvedAt ? 'Criativo aprovado' : 'Criativo rejeitado'}
              </p>
              {approval.feedback && <p className="text-xs text-gray-600 mt-0.5">"{approval.feedback}"</p>}
            </div>
          </div>
        )}

        {/* Mídia */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {activeMedia ? (
            <div className="bg-gray-900 flex items-center justify-center min-h-[280px] max-h-[480px]">
              {activeMedia.mimeType.startsWith('video') ? (
                <video src={activeMedia.url} controls className="max-w-full max-h-[480px]" />
              ) : (
                <img src={activeMedia.url} alt="" className="max-w-full max-h-[480px] object-contain" />
              )}
            </div>
          ) : (
            <div className="bg-gray-100 flex items-center justify-center h-48">
              <ImageIcon className="w-12 h-12 text-gray-300" />
            </div>
          )}

          {/* Thumbnails */}
          {media.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {media.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setActiveThumb(i)}
                  className={cn(
                    'flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all',
                    activeThumb === i ? 'ring-2 ring-violet-600' : 'opacity-60 hover:opacity-100',
                  )}
                >
                  {m.mediaAsset.mimeType.startsWith('video') ? (
                    <video src={m.mediaAsset.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={m.mediaAsset.url} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Copy */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
          {creative.title && <h2 className="font-semibold text-gray-900">{creative.title}</h2>}
          {creative.caption && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{creative.caption}</p>
          )}
          {creative.hashtags.length > 0 && (
            <p className="text-sm text-violet-600">
              {creative.hashtags.map((h) => `#${h}`).join(' ')}
            </p>
          )}
        </div>

        {/* Name input (for first-time visitors) */}
        {!alreadyActioned && (
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
            <p className="text-sm font-medium text-gray-700">Seu nome (para identificação)</p>
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Ex: João Silva"
            />
          </div>
        )}

        {/* Action buttons */}
        {!alreadyActioned && (
          <div className="space-y-3">
            {showRejectForm ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Rejeitar criativo
                </h3>
                <form onSubmit={handleReject} className="space-y-3">
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    rows={3}
                    placeholder="Descreva o que precisa ser alterado..."
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="flex-1 border border-gray-200 text-gray-600 text-sm py-2.5 rounded-xl hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading === 'reject'}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading === 'reject' && <Loader2 className="w-4 h-4 animate-spin" />}
                      Confirmar rejeição
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium py-3 rounded-xl transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Solicitar alterações
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading === 'approve'}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-3 rounded-xl disabled:opacity-50 transition-colors"
                >
                  {actionLoading === 'approve'
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle2 className="w-4 h-4" />
                  }
                  Aprovar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Comentários ({comments.length})
          </h3>

          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum comentário ainda.</p>
          ) : (
            <div className="space-y-3">
              {comments.filter((c) => !c.isInternal).map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-medium text-xs flex-shrink-0">
                    {c.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-700">{c.authorName}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{c.text}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(c.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment form */}
          <form onSubmit={handleComment} className="space-y-2 pt-2 border-t border-gray-50">
            {!authorName && (
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Seu nome"
              />
            )}
            <div className="flex gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Escreva um comentário..."
              />
              <button
                type="submit"
                disabled={commentLoading || !comment.trim()}
                className="flex-shrink-0 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl disabled:opacity-50 transition-colors"
              >
                {commentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            {commentError && <p className="text-xs text-red-500">{commentError}</p>}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-8">
          Powered by Social Scheduler
        </p>
      </div>
    </div>
  )
}
