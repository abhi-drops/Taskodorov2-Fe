import { api } from './client'
import type { FeedbackResponse, FeedbackSubmission } from '../../types/feedback'

/** No auth header — anonymous submission, see `docs/feat-feedback-from-be.md`. */
export const feedbackApi = {
  submit: (body: FeedbackSubmission) => api.post<FeedbackResponse>('/feedback', body),
}
