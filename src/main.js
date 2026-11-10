import './style.css'
import { sendMessage, ApiError, MODEL } from './api.js'

// ── 환경 변수에서 API 키 로드 ──
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''

// ── 상태 관리 ──
let previousResponseId = null
let isLoading = false

/**
 * API 상태 종류
 * - 'no-key'      : 키 미설정
 * - 'unverified'  : 키 있지만 요청 전 (연결 미확인)
 * - 'success'     : 요청 성공
 * - 'error'       : 요청 실패
 */
let apiStatus = API_KEY ? 'unverified' : 'no-key'
let apiStatusMessage = ''

// ── DOM 렌더링 ──
document.querySelector('#app').innerHTML = `
<div class="chat-container">
  <header class="chat-header">
    <div class="header-left">
      <h1>AI Chatbot</h1>
      <span class="model-badge">${MODEL}</span>
    </div>
    <div class="header-right">
      <span id="api-status" class="status-badge"></span>
      <button id="reset-btn" class="reset-btn" title="대화 초기화">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
      </button>
    </div>
  </header>

  <main id="chat-messages" class="chat-messages">
    <div class="welcome-message">
      <p>안녕하세요! 무엇이든 물어보세요.</p>
      <p class="welcome-sub">OpenAI Responses API를 사용하는 교육용 챗봇입니다.</p>
    </div>
  </main>

  <footer class="chat-footer">
    <form id="chat-form" class="chat-form">
      <input
        type="text"
        id="message-input"
        class="message-input"
        placeholder="메시지를 입력하세요…"
        autocomplete="off"
        ${!API_KEY ? 'disabled' : ''}
      />
      <button type="submit" id="send-btn" class="send-btn" ${!API_KEY ? 'disabled' : ''}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </form>
  </footer>
</div>
`

// ── DOM 요소 참조 ──
const chatMessages = document.getElementById('chat-messages')
const chatForm = document.getElementById('chat-form')
const messageInput = document.getElementById('message-input')
const sendBtn = document.getElementById('send-btn')
const resetBtn = document.getElementById('reset-btn')
const apiStatusEl = document.getElementById('api-status')

// ── 상태 표시 업데이트 ──
function updateStatusDisplay() {
  apiStatusEl.classList.remove('status-no-key', 'status-unverified', 'status-success', 'status-error')

  switch (apiStatus) {
    case 'no-key':
      apiStatusEl.textContent = '키 미설정'
      apiStatusEl.classList.add('status-no-key')
      break
    case 'unverified':
      apiStatusEl.textContent = '연결 미확인'
      apiStatusEl.classList.add('status-unverified')
      break
    case 'success':
      apiStatusEl.textContent = '요청 성공'
      apiStatusEl.classList.add('status-success')
      break
    case 'error':
      apiStatusEl.textContent = apiStatusMessage
      apiStatusEl.classList.add('status-error')
      break
  }
}

// ── 메시지 추가 함수 ──
function addMessage(role, text) {
  // 환영 메시지 제거
  const welcome = chatMessages.querySelector('.welcome-message')
  if (welcome) welcome.remove()

  const messageEl = document.createElement('div')
  messageEl.classList.add('message', `message-${role}`)

  const bubbleEl = document.createElement('div')
  bubbleEl.classList.add('bubble')
  bubbleEl.textContent = text

  messageEl.appendChild(bubbleEl)
  chatMessages.appendChild(messageEl)
  chatMessages.scrollTop = chatMessages.scrollHeight
}

// ── 로딩 표시 ──
function showLoading() {
  const loadingEl = document.createElement('div')
  loadingEl.classList.add('message', 'message-assistant', 'loading-message')

  const bubbleEl = document.createElement('div')
  bubbleEl.classList.add('bubble', 'loading-bubble')
  bubbleEl.innerHTML = `
    <div class="loading-dots">
      <span></span><span></span><span></span>
    </div>
  `

  loadingEl.appendChild(bubbleEl)
  chatMessages.appendChild(loadingEl)
  chatMessages.scrollTop = chatMessages.scrollHeight
}

function hideLoading() {
  const loadingEl = chatMessages.querySelector('.loading-message')
  if (loadingEl) loadingEl.remove()
}

// ── 전송 처리 ──
async function handleSubmit(e) {
  e.preventDefault()

  const userMessage = messageInput.value.trim()
  if (!userMessage || isLoading) return

  // 중복 전송 방지
  isLoading = true
  sendBtn.disabled = true
  messageInput.disabled = true

  addMessage('user', userMessage)
  messageInput.value = ''
  showLoading()

  try {
    const result = await sendMessage(API_KEY, userMessage, previousResponseId)
    previousResponseId = result.responseId
    apiStatus = 'success'
    apiStatusMessage = ''
    hideLoading()
    addMessage('assistant', result.text)
  } catch (error) {
    hideLoading()
    if (error instanceof ApiError) {
      apiStatus = 'error'
      apiStatusMessage = error.friendlyMessage
      addMessage('error', error.friendlyMessage)
    } else {
      apiStatus = 'error'
      apiStatusMessage = '네트워크 오류'
      addMessage('error', '네트워크 오류 — 인터넷 연결을 확인해 주세요.')
    }
  } finally {
    isLoading = false
    sendBtn.disabled = !API_KEY
    messageInput.disabled = !API_KEY
    messageInput.focus()
    updateStatusDisplay()
  }
}

// ── 대화 초기화 ──
function handleReset() {
  previousResponseId = null
  chatMessages.innerHTML = `
    <div class="welcome-message">
      <p>안녕하세요! 무엇이든 물어보세요.</p>
      <p class="welcome-sub">OpenAI Responses API를 사용하는 교육용 챗봇입니다.</p>
    </div>
  `
  apiStatus = API_KEY ? 'unverified' : 'no-key'
  apiStatusMessage = ''
  updateStatusDisplay()
  messageInput.focus()
}

// ── 이벤트 리스너 ──
chatForm.addEventListener('submit', handleSubmit)
resetBtn.addEventListener('click', handleReset)

// Enter 키 전송, Shift+Enter 줄바꿈 (input이라 줄바꿈 없음)
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    chatForm.dispatchEvent(new Event('submit'))
  }
})

// ── 초기 상태 표시 ──
updateStatusDisplay()
if (API_KEY) {
  messageInput.focus()
}
