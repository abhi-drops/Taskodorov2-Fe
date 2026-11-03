/** `POST /feedback` — see `docs/feat-feedback-from-be.md`. */
export interface FeedbackSubmission {
  /** 0–5 inclusive, in steps of 0.5. */
  rating: number
  comment?: string
  platform?: string
  appVersion?: string
}

export interface FeedbackResponse {
  feedback: {
    id: string
    rating: number
    comment: string | null
    platform: string | null
    appVersion: string | null
    createdAt: string
  }
}
