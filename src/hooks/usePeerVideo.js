import { useState, useRef, useEffect } from 'react'

let peerScriptPromise = null
function loadPeerJS() {
  if (!peerScriptPromise) {
    peerScriptPromise = new Promise(resolve => {
      if (window.Peer) { resolve(window.Peer); return }
      const s = document.createElement('script')
      s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'
      s.onload  = () => resolve(window.Peer)
      s.onerror = () => { peerScriptPromise = null; resolve(null) }
      document.head.appendChild(s)
    })
  }
  return peerScriptPromise
}

function blankStream() {
  const canvas = document.createElement('canvas')
  canvas.width = 1; canvas.height = 1
  return canvas.captureStream(0)
}

export function usePeerVideo() {
  const [mode,     setMode]     = useState(null)   // null | 'host' | 'viewer'
  const [status,   setStatus]   = useState('idle') // idle | loading | waiting | connected | error
  const [roomCode, setRoomCode] = useState('')
  const [errMsg,   setErrMsg]   = useState('')

  const localRef  = useRef(null)  // <video> for host preview
  const remoteRef = useRef(null)  // <video> for viewer stream

  const peerRef   = useRef(null)
  const streamRef = useRef(null)

  function destroy() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    peerRef.current?.destroy()
    peerRef.current  = null
    streamRef.current = null
  }

  useEffect(() => () => destroy(), [])

  async function startHost() {
    setMode('host'); setStatus('loading'); setErrMsg('')
    try {
      const Peer = await loadPeerJS()
      if (!Peer) throw new Error('Could not load PeerJS library')

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      if (localRef.current) { localRef.current.srcObject = stream; localRef.current.play().catch(() => {}) }

      const code = Math.random().toString(36).slice(2, 8).toUpperCase()
      setRoomCode(code)

      const peer = new Peer(`hoopmind-${code}`, {
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
      })
      peerRef.current = peer

      peer.on('open',  ()  => setStatus('waiting'))
      peer.on('call',  call => {
        call.answer(stream)
        call.on('stream', () => setStatus('connected'))
      })
      peer.on('error', e  => { setStatus('error'); setErrMsg(e.message) })
    } catch (e) {
      setStatus('error'); setErrMsg(e.message)
    }
  }

  async function joinRoom(code) {
    setMode('viewer'); setStatus('loading'); setErrMsg('')
    try {
      const Peer = await loadPeerJS()
      if (!Peer) throw new Error('Could not load PeerJS library')

      const peer = new Peer({
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
      })
      peerRef.current = peer

      peer.on('open', () => {
        const call = peer.call(`hoopmind-${code.trim().toUpperCase()}`, blankStream())
        call.on('stream', remote => {
          if (remoteRef.current) { remoteRef.current.srcObject = remote; remoteRef.current.play().catch(() => {}) }
          setStatus('connected')
        })
        call.on('error', e => { setStatus('error'); setErrMsg(e.message) })
      })
      peer.on('error', e => { setStatus('error'); setErrMsg(e.message) })
    } catch (e) {
      setStatus('error'); setErrMsg(e.message)
    }
  }

  function disconnect() {
    destroy()
    setMode(null); setStatus('idle'); setRoomCode(''); setErrMsg('')
  }

  return { mode, status, roomCode, errMsg, localRef, remoteRef, startHost, joinRoom, disconnect }
}
