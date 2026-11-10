/**
 * OpenAI Responses API 모듈
 *
 * 엔드포인트: POST https://api.openai.com/v1/responses
 * 참고 문서: https://platform.openai.com/docs/api-reference/responses/create
 *
 * 브라우저에서 직접 API를 호출합니다.
 * ⚠️ 교육용 실습 전용 — 프로덕션에서는 반드시 서버 사이드에서 키를 관리하세요.
 */

const API_URL = 'https://api.openai.com/v1/responses'
const MODEL = 'gpt-4.1-mini'

/**
 * Responses API에 메시지를 보내고 응답을 반환합니다.
 *
 * @param {string} apiKey - OpenAI API 키
 * @param {string} userMessage - 사용자 메시지
 * @param {string|null} previousResponseId - 이전 응답 ID (멀티턴 대화용)
 * @returns {Promise<{text: string, responseId: string}>}
 */
export async function sendMessage(apiKey, userMessage, previousResponseId = null) {
  const body = {
    model: MODEL,
    input: userMessage,
    instructions: '당신은 친절하고 도움이 되는 AI 어시스턴트입니다. 사용자의 질문에 명확하고 간결하게 답변하세요.',
    store: true,
  }

  // 이전 응답이 있으면 대화 맥락을 이어갑니다.
  if (previousResponseId) {
    body.previous_response_id = previousResponseId
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message = errorData?.error?.message || response.statusText
    throw new ApiError(response.status, message)
  }

  const data = await response.json()

  // output 배열에서 type이 "message"인 항목의 텍스트를 추출합니다.
  const assistantMessage = data.output
    ?.filter((item) => item.type === 'message' && item.role === 'assistant')
    ?.flatMap((item) => item.content)
    ?.filter((content) => content.type === 'output_text')
    ?.map((content) => content.text)
    ?.join('\n')

  if (!assistantMessage) {
    throw new ApiError(0, '응답에서 메시지를 추출할 수 없습니다.')
  }

  return {
    text: assistantMessage,
    responseId: data.id,
  }
}

/**
 * API 오류를 나타내는 커스텀 에러 클래스
 */
export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }

  /**
   * 사용자에게 보여줄 친화적인 에러 메시지를 반환합니다.
   */
  get friendlyMessage() {
    switch (this.status) {
      case 401:
        return '인증 실패 — API 키가 유효하지 않습니다. 키를 확인해 주세요.'
      case 403:
        return '접근 거부 — 이 API를 사용할 권한이 없습니다.'
      case 429:
        return '요청 한도 초과 — 잠시 후 다시 시도해 주세요.'
      case 500:
      case 502:
      case 503:
        return '서버 오류 — OpenAI 서버에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      default:
        return this.message || '알 수 없는 오류가 발생했습니다.'
    }
  }
}

export { MODEL }

